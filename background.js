// Service worker. Listens for the toggle-cursor keyboard command and flips
// the enabled flag in storage. The content script + popup listen for the
// storage change and respond live, so no per-tab messaging needed.

const KEY_ENABLED = "pokeCursorEnabled";

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-cursor") return;
  chrome.storage.sync.get({ [KEY_ENABLED]: true }, (result) => {
    const currentlyEnabled = result[KEY_ENABLED] !== false;
    chrome.storage.sync.set({ [KEY_ENABLED]: !currentlyEnabled });
  });
});
