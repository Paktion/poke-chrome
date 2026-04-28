const STORAGE_KEY = "dittoCursorEnabled";
const toggle = document.getElementById("toggle");

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
  toggle.checked = result[STORAGE_KEY] !== false;
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY]: toggle.checked });
});
