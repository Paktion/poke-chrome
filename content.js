// Pokemon Cursor - content script
// Injects a sprite-based pokemon follower into every page. Walks toward the
// mouse at constant speed, faces the direction of travel, and bounces in
// place playing the walking-south animation when parked on the cursor.
//
// Switching pokemon via the popup swaps the sprite live without resetting
// where the follower currently is on screen.

(function () {
  "use strict";

  if (window.__pokeCursorInjected__) return;
  window.__pokeCursorInjected__ = true;

  // -----------------------------------------------------------------
  // Pokemon configs. Walk speed scales with in-game base Speed stat,
  // anchored to Ditto (base 48 = 0.9 px/frame).
  // -----------------------------------------------------------------
  const REFERENCE_BASE_SPEED = 48;
  const REFERENCE_WALK_SPEED = 0.9;
  function speedFor(baseSpeed) {
    return Math.round((REFERENCE_WALK_SPEED * baseSpeed) / REFERENCE_BASE_SPEED * 100) / 100;
  }

  // Sheets are normalized to 4 rows: 0=down, 1=left, 2=right, 3=up.
  const POKEMON = [
    {
      id: "ditto",
      name: "Ditto",
      file: "ditto.png",
      frameWidth: 64,
      frameHeight: 64,
      framesPerDirection: 4,
      displayWidth: 64,
      displayHeight: 64,
      walkSpeed: speedFor(48),
      frameInterval: 240,
      bounceAmplitude: 8,
      bouncePeriod: 420,
    },
    {
      id: "infernape",
      name: "Infernape",
      file: "infernape.png",
      frameWidth: 112,
      frameHeight: 148,
      framesPerDirection: 2,
      displayWidth: 54,
      displayHeight: 72,
      walkSpeed: speedFor(108),
      frameInterval: 220,
      bounceAmplitude: 10,
      bouncePeriod: 380,
    },
    {
      id: "lucario",
      name: "Lucario",
      file: "lucario.png",
      frameWidth: 99,
      frameHeight: 129,
      framesPerDirection: 2,
      displayWidth: 54,
      displayHeight: 70,
      walkSpeed: speedFor(90),
      frameInterval: 240,
      bounceAmplitude: 9,
      bouncePeriod: 400,
    },
    {
      id: "shiftree",
      name: "Shiftree",
      file: "shiftree.png",
      frameWidth: 140,
      frameHeight: 114,
      framesPerDirection: 2,
      displayWidth: 60,
      displayHeight: 48,
      walkSpeed: speedFor(80),
      frameInterval: 280,
      bounceAmplitude: 8,
      bouncePeriod: 420,
    },
    {
      id: "mewtwo",
      name: "Mewtwo",
      file: "mewtwo.png",
      frameWidth: 229,
      frameHeight: 247,
      framesPerDirection: 2,
      displayWidth: 60,
      displayHeight: 64,
      walkSpeed: speedFor(130),
      frameInterval: 220,
      bounceAmplitude: 10,
      bouncePeriod: 380,
    },
  ];

  function findConfig(id) {
    return POKEMON.find((p) => p.id === id) || POKEMON[0];
  }

  // -----------------------------------------------------------------
  // Sprite-sheet rows.
  // -----------------------------------------------------------------
  const ROW_DOWN = 0;
  const ROW_LEFT = 1;
  const ROW_RIGHT = 2;
  const ROW_UP = 3;
  const ROWS = 4;
  const ARRIVE_RADIUS = 4;

  // -----------------------------------------------------------------
  // Storage keys + helpers.
  // -----------------------------------------------------------------
  const KEY_ENABLED = "pokeCursorEnabled";
  const KEY_ID = "pokeCursorId";

  function syncFromStorage() {
    try {
      chrome.storage.sync.get(
        { [KEY_ENABLED]: true, [KEY_ID]: "ditto" },
        (result) => {
          applyState(
            result[KEY_ENABLED] !== false,
            result[KEY_ID] || "ditto"
          );
        }
      );
    } catch {
      applyState(true, "ditto");
    }
  }

  // -----------------------------------------------------------------
  // The follower. configRef holds the active pokemon; the rAF loop reads
  // from it each tick so swapping pokemon doesn't reset the position.
  // -----------------------------------------------------------------
  let teardown = null;
  let configRef = findConfig("ditto");

  function applyElementStyle(el, cfg) {
    const url = chrome.runtime.getURL(cfg.file);
    el.style.width = cfg.displayWidth + "px";
    el.style.height = cfg.displayHeight + "px";
    el.style.backgroundImage = "url(" + url + ")";
    el.style.backgroundSize =
      cfg.displayWidth * cfg.framesPerDirection + "px " +
      cfg.displayHeight * ROWS + "px";
  }

  function start() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return null;
    }

    let stopped = false;

    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("data-poke-cursor", "");
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      top: "0",
      pointerEvents: "none",
      backgroundRepeat: "no-repeat",
      imageRendering: "pixelated",
      willChange: "transform",
      zIndex: "2147483647",
      opacity: "0",
      transition: "opacity 0.2s",
      margin: "0",
      padding: "0",
      border: "0",
      boxShadow: "none",
      filter: "none",
      mixBlendMode: "normal",
    });
    applyElementStyle(el, configRef);

    let targetX = -200;
    let targetY = -200;
    let currentX = -200;
    let currentY = -200;
    let visible = false;
    let direction = ROW_DOWN;
    let frameIdx = 0;
    let lastFrameTime = 0;
    let rafId = 0;

    function aimAt(clientX, clientY) {
      const cfg = configRef;
      targetX = clientX - cfg.displayWidth / 2;
      targetY = clientY - cfg.displayHeight / 2;
    }

    function onMove(e) {
      aimAt(e.clientX, e.clientY);
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
      if (stopped) return;
      const cfg = configRef;
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const distance = Math.hypot(dx, dy);
      const moving = distance > ARRIVE_RADIUS;

      if (moving) {
        const stepX = (dx / distance) * cfg.walkSpeed;
        const stepY = (dy / distance) * cfg.walkSpeed;
        currentX += stepX;
        currentY += stepY;

        if (Math.abs(stepX) > Math.abs(stepY)) {
          direction = stepX > 0 ? ROW_RIGHT : ROW_LEFT;
        } else {
          direction = stepY > 0 ? ROW_DOWN : ROW_UP;
        }
      } else {
        direction = ROW_DOWN;
      }

      if (time - lastFrameTime > cfg.frameInterval) {
        frameIdx = (frameIdx + 1) % cfg.framesPerDirection;
        lastFrameTime = time;
      }

      let bounceY = 0;
      if (!moving) {
        const phase = (time % cfg.bouncePeriod) / cfg.bouncePeriod;
        bounceY = -Math.abs(Math.sin(phase * Math.PI)) * cfg.bounceAmplitude;
      }

      const bgX = -frameIdx * cfg.displayWidth;
      const bgY = -direction * cfg.displayHeight;
      el.style.transform = "translate3d(" + currentX + "px," + (currentY + bounceY) + "px,0)";
      el.style.backgroundPosition = bgX + "px " + bgY + "px";

      rafId = requestAnimationFrame(tick);
    }

    document.documentElement.appendChild(el);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onMouseOut);
    rafId = requestAnimationFrame(tick);

    return {
      cleanup: function () {
        stopped = true;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseout", onMouseOut);
        try { cancelAnimationFrame(rafId); } catch (_) {}
        if (el.parentNode) el.parentNode.removeChild(el);
      },
      // Swap to a different pokemon without losing the on-screen position.
      swap: function (newCfg) {
        applyElementStyle(el, newCfg);
        // Re-center on the current target with the new sprite size.
        if (visible) {
          // approximate by keeping currentX/currentY where they are;
          // next mousemove naturally re-aims with the new offset
        }
        frameIdx = 0;
        lastFrameTime = 0;
      },
    };
  }

  // -----------------------------------------------------------------
  // Lifecycle.
  // -----------------------------------------------------------------
  function applyState(enabled, id) {
    const newCfg = findConfig(id);
    const idChanged = newCfg !== configRef;
    configRef = newCfg;

    if (enabled) {
      if (!teardown) {
        teardown = start();
      } else if (idChanged) {
        teardown.swap(configRef);
      }
    } else if (teardown) {
      teardown.cleanup();
      teardown = null;
    }
  }

  // Remove any leftover follower elements from previous content-script
  // versions (e.g. an older v1.0 ditto-cursor still in the DOM).
  document
    .querySelectorAll("[data-poke-cursor], [data-ditto-cursor]")
    .forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

  syncFromStorage();
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      if (KEY_ENABLED in changes || KEY_ID in changes) {
        syncFromStorage();
      }
    });
  } catch (_) {
    /* no-op */
  }
})();
