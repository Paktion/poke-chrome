# Pokemon Cursor

A Chrome extension that puts a Pokemon on every page, trailing your mouse
like a HeartGold/SoulSilver follower. Walks toward the cursor at constant
speed, faces the direction it's moving, and bounces in place playing the
walking-south animation when it catches up.

Pick from **Ditto, Infernape, Lucario, Shiftree, or Mewtwo**. Walk speed
scales with each Pokemon's in-game base Speed stat — Ditto plods, Mewtwo
flies.

Ported from the cursor on [athinshetty.com](https://athinshetty.com).

## Install (unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Pin the extension and click its icon to open the popup. Toggle on/off
   and pick which pokemon should follow you.

Reload tabs you already had open after installing — content scripts only
attach on page load. Toggling pokemon and on/off after that propagates
live across open tabs.

## Keyboard shortcut

`Ctrl+Shift+0` (Windows/Linux) / `Cmd+Shift+0` (Mac) toggles the
follower on/off. Chrome auto-maps `Ctrl→Cmd` on Mac, so one entry
covers both platforms. Picked because `Ctrl+0` / `Cmd+0` is zoom
reset but adding Shift isn't claimed by Chrome or macOS.

You can rebind it at `chrome://extensions/shortcuts`. The shortcut only
fires while Chrome has focus.

## How it works

- `manifest.json` registers a content script that runs on `<all_urls>` at
  `document_idle`.
- `content.js` injects a `position: fixed` `div` whose background-image
  is the active pokemon's sprite sheet. A `requestAnimationFrame` loop
  lerps the element toward the cursor at the pokemon's `walkSpeed`,
  picks the sprite-sheet row from the dominant axis of motion, and
  cycles walk frames.
- The popup writes two values to `chrome.storage.sync`: an enabled
  boolean and the active pokemon id. The content script reads them on
  load and listens for changes via `chrome.storage.onChanged`, swapping
  sprites or attaching/detaching the follower live.

## Pokemon

Walk speed = `0.9 × baseSpeed / 48` (Ditto's base 48 anchors the scale).

| Pokemon   | Base Speed | px/frame |
|-----------|-----------:|---------:|
| Ditto     |         48 |     0.90 |
| Shiftree  |         80 |     1.50 |
| Lucario   |         90 |     1.69 |
| Infernape |        108 |     2.03 |
| Mewtwo    |        130 |     2.44 |

## Files

- `manifest.json` — Manifest V3 declaration
- `content.js` — the cursor follower (vanilla JS, no build)
- `popup.html` / `popup.js` — toggle + pokemon picker UI
- `ditto.png`, `infernape.png`, `lucario.png`, `shiftree.png`, `mewtwo.png`
  — normalized sprite sheets, rows = down/left/right/up
- `icons/` — 16/48/128 PNG icons used in the toolbar and store

## Limitations

- Doesn't run inside iframes (`all_frames: false`) — keeps it from
  rendering twice on pages that embed sub-frames.
- Doesn't run on `chrome://`, `chrome-extension://`, or the Chrome Web
  Store — Chrome blocks content scripts there.
- Hidden on touch / no-cursor devices.
