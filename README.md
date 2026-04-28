# Ditto Cursor

A Chrome extension that puts a Ditto on every page, trailing your mouse like
a Pokémon HeartGold/SoulSilver follower. Walks toward the cursor at constant
speed, faces the direction it's moving, and bounces in place playing the
walking-south animation when it catches up.

Ported from the Ditto cursor on [athinshetty.com](https://athinshetty.com).

## Install (unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser — Edge,
   Brave, Arc).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Pin the extension and click its icon to toggle Ditto on/off.

Reload any tabs you already had open after installing or toggling — content
scripts only attach on page load.

## How it works

- `manifest.json` registers a content script that runs on `<all_urls>` at
  `document_idle`.
- `content.js` injects a `position: fixed` `div` with the Ditto sprite
  sheet as its background. A `requestAnimationFrame` loop lerps it toward
  the cursor at 0.9 px/frame, picks the sprite-sheet row from the dominant
  axis of motion, and cycles walk frames.
- The popup writes a single boolean to `chrome.storage.sync`. The content
  script reads it on load and listens for changes via
  `chrome.storage.onChanged`, attaching/detaching the follower live.

## Files

- `manifest.json` — Manifest V3 declaration
- `content.js` — the cursor follower (vanilla JS, no build)
- `popup.html` / `popup.js` — on/off toggle UI
- `ditto.png` — 4×4 sprite sheet (rows: down, left, right, up)
- `icons/` — 16/48/128 PNG icons used in the toolbar and store

## Limitations

- Doesn't run inside iframes (`all_frames: false`) — keeps it from
  rendering twice on pages that embed sub-frames.
- Doesn't run on `chrome://`, `chrome-extension://`, or the Chrome Web
  Store — Chrome blocks content scripts there. Nothing the extension can
  do about it.
- Hidden on touch / no-cursor devices.
