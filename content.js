// Ditto Cursor - content script
// Injects a sprite-based Ditto follower into every page. Walks toward the
// mouse at constant speed, faces the direction of travel, and bounces in
// place while playing the walking-south animation when parked on the cursor.
//
// Ported from the Ditto cursor in athinshetty.com.

(function () {
  "use strict";

  // Skip if already injected (in case the script runs twice).
  if (window.__dittoCursorInjected__) return;
  window.__dittoCursorInjected__ = true;

  // -----------------------------------------------------------------
  // Sprite + animation config (Ditto, 4x4 sheet at 64x64 per frame).
  // -----------------------------------------------------------------
  const SPRITE_URL = chrome.runtime.getURL("ditto.png");
  const FRAME_SIZE = 64;
  const FRAMES_PER_ROW = 4;
  const ROWS = 4;

  // Sprite-sheet row indices, verified visually for ditto.png.
  const ROW_DOWN = 0;
  const ROW_LEFT = 1;
  const ROW_RIGHT = 2;
  const ROW_UP = 3;

  // Movement / animation tuning.
  const WALK_SPEED_PX_PER_FRAME = 0.9;
  const FRAME_INTERVAL_MS = 240;
  const ARRIVE_RADIUS = 4;
  const BOUNCE_AMPLITUDE_PX = 8;
  const BOUNCE_PERIOD_MS = 420;

  // Aim point centers the sprite on the cursor.
  const TRAIL_OFFSET_X = -FRAME_SIZE / 2;
  const TRAIL_OFFSET_Y = -FRAME_SIZE / 2;

  // -----------------------------------------------------------------
  // Storage-backed enable flag. Default: on.
  // -----------------------------------------------------------------
  const STORAGE_KEY = "dittoCursorEnabled";

  let enabled = true;
  let teardown = null;

  function readEnabledThen(cb) {
    try {
      chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
        cb(result[STORAGE_KEY] !== false);
      });
    } catch {
      cb(true);
    }
  }

  function watchEnabled(cb) {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        if (STORAGE_KEY in changes) cb(changes[STORAGE_KEY].newValue !== false);
      });
    } catch {
      /* no-op */
    }
  }

  // -----------------------------------------------------------------
  // The follower itself.
  // -----------------------------------------------------------------
  function start() {
    // Skip touch / no-cursor devices.
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return null;
    }

    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-ditto-cursor", "");
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: FRAME_SIZE + "px",
      height: FRAME_SIZE + "px",
      pointerEvents: "none",
      backgroundImage: `url(${SPRITE_URL})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${FRAME_SIZE * FRAMES_PER_ROW}px ${FRAME_SIZE * ROWS}px`,
      imageRendering: "pixelated",
      willChange: "transform",
      zIndex: "2147483647",
      opacity: "0",
      transition: "opacity 0.2s",
      // Defensive resets in case the host page styles `div` aggressively.
      margin: "0",
      padding: "0",
      border: "0",
      boxShadow: "none",
      filter: "none",
      mixBlendMode: "normal",
    });

    let targetX = -200;
    let targetY = -200;
    let currentX = -200;
    let currentY = -200;
    let visible = false;
    let direction = ROW_DOWN;
    let frameIdx = 0;
    let lastFrameTime = 0;
    let rafId = 0;

    function onMove(e) {
      targetX = e.clientX + TRAIL_OFFSET_X;
      targetY = e.clientY + TRAIL_OFFSET_Y;
      if (!visible) {
        currentX = targetX;
        currentY = targetY;
        visible = true;
        el.style.opacity = "1";
      }
    }

    function onMouseOut(e) {
      if (!e.relatedTarget) {
        el.style.opacity = "0";
        visible = false;
      }
    }

    function tick(time) {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const distance = Math.hypot(dx, dy);
      const moving = distance > ARRIVE_RADIUS;

      if (moving) {
        const stepX = (dx / distance) * WALK_SPEED_PX_PER_FRAME;
        const stepY = (dy / distance) * WALK_SPEED_PX_PER_FRAME;
        currentX += stepX;
        currentY += stepY;

        if (Math.abs(stepX) > Math.abs(stepY)) {
          direction = stepX > 0 ? ROW_RIGHT : ROW_LEFT;
        } else {
          direction = stepY > 0 ? ROW_DOWN : ROW_UP;
        }
      } else {
        // Walk-in-place south animation while parked on the cursor.
        direction = ROW_DOWN;
      }

      // Cycle frames whether walking or bouncing in place.
      if (time - lastFrameTime > FRAME_INTERVAL_MS) {
        frameIdx = (frameIdx + 1) % FRAMES_PER_ROW;
        lastFrameTime = time;
      }

      let bounceY = 0;
      if (!moving) {
        const phase = (time % BOUNCE_PERIOD_MS) / BOUNCE_PERIOD_MS;
        bounceY = -Math.abs(Math.sin(phase * Math.PI)) * BOUNCE_AMPLITUDE_PX;
      }

      const bgX = -frameIdx * FRAME_SIZE;
      const bgY = -direction * FRAME_SIZE;
      el.style.transform = `translate3d(${currentX}px, ${currentY + bounceY}px, 0)`;
      el.style.backgroundPosition = `${bgX}px ${bgY}px`;

      rafId = requestAnimationFrame(tick);
    }

    document.documentElement.appendChild(el);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onMouseOut);
    rafId = requestAnimationFrame(tick);

    return function cleanup() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(rafId);
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }

  // -----------------------------------------------------------------
  // Lifecycle: start on load if enabled, react to toggle changes.
  // -----------------------------------------------------------------
  function applyEnabled(next) {
    enabled = next;
    if (enabled && !teardown) {
      teardown = start();
    } else if (!enabled && teardown) {
      teardown();
      teardown = null;
    }
  }

  readEnabledThen((initial) => applyEnabled(initial));
  watchEnabled((next) => applyEnabled(next));
})();
