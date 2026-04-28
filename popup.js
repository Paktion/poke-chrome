const KEY_ENABLED = "pokeCursorEnabled";
const KEY_ID = "pokeCursorId";

// Same configs as content.js (sprite-sheet dims). Display dims here are
// just for the picker icons and animate at the same frameInterval as the
// cursor's idle animation.
const POKEMON = [
  { id: "ditto",     name: "Ditto",     file: "ditto.png",     frameWidth: 64,  frameHeight: 64,  framesPerDirection: 4, frameInterval: 240 },
  { id: "infernape", name: "Infernape", file: "infernape.png", frameWidth: 112, frameHeight: 148, framesPerDirection: 2, frameInterval: 220 },
  { id: "lucario",   name: "Lucario",   file: "lucario.png",   frameWidth: 99,  frameHeight: 129, framesPerDirection: 2, frameInterval: 240 },
  { id: "shiftree",  name: "Shiftree",  file: "shiftree.png",  frameWidth: 140, frameHeight: 114, framesPerDirection: 2, frameInterval: 280 },
  { id: "mewtwo",    name: "Mewtwo",    file: "mewtwo.png",    frameWidth: 229, frameHeight: 247, framesPerDirection: 2, frameInterval: 220 },
];

const ICON_BOX = 36; // inner sprite area inside the .pick button
const toggle = document.getElementById("toggle");
const picker = document.getElementById("picker");

let activeId = "ditto";
let activeFrame = 0;
let frameTimer = null;

// -------- Build picker --------
const buttons = POKEMON.map((p) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pick";
  btn.setAttribute("aria-label", "Use " + p.name + " cursor");
  btn.setAttribute("aria-pressed", "false");
  btn.title = p.name;

  const span = document.createElement("span");
  const scale = Math.min(ICON_BOX / p.frameWidth, ICON_BOX / p.frameHeight);
  const w = p.frameWidth * scale;
  const h = p.frameHeight * scale;
  span.style.width = w + "px";
  span.style.height = h + "px";
  span.style.backgroundImage = "url(" + p.file + ")";
  span.style.backgroundSize =
    p.frameWidth * p.framesPerDirection * scale + "px " +
    p.frameHeight * 4 * scale + "px";
  span.style.backgroundPosition = "0 0";

  btn.appendChild(span);
  btn.addEventListener("click", () => {
    chrome.storage.sync.set({ [KEY_ID]: p.id });
  });

  return { config: p, btn, span, scaledW: w };
});

buttons.forEach(({ btn }) => picker.appendChild(btn));

function setActiveId(id) {
  activeId = id;
  activeFrame = 0;
  buttons.forEach(({ config, btn, span, scaledW }) => {
    const isActive = config.id === id;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    span.style.backgroundPosition = (isActive ? -activeFrame * scaledW : 0) + "px 0";
  });
  restartFrameTimer();
}

function restartFrameTimer() {
  if (frameTimer) clearInterval(frameTimer);
  const active = buttons.find((b) => b.config.id === activeId);
  if (!active) return;
  frameTimer = setInterval(() => {
    activeFrame = (activeFrame + 1) % active.config.framesPerDirection;
    active.span.style.backgroundPosition = -activeFrame * active.scaledW + "px 0";
  }, active.config.frameInterval);
}

// -------- Toggle --------
toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ [KEY_ENABLED]: toggle.checked });
});

// -------- Initial load --------
chrome.storage.sync.get(
  { [KEY_ENABLED]: true, [KEY_ID]: "ditto" },
  (result) => {
    toggle.checked = result[KEY_ENABLED] !== false;
    setActiveId(result[KEY_ID] || "ditto");
  }
);

// -------- React to external changes (cross-tab popup syncing) --------
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (KEY_ENABLED in changes) toggle.checked = changes[KEY_ENABLED].newValue !== false;
  if (KEY_ID in changes) setActiveId(changes[KEY_ID].newValue || "ditto");
});
