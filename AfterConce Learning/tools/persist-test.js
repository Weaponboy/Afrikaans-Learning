// Persistence test: boots the REAL app.js in Node with DOM stubs, plays a
// 10-card flash session, then "restarts" (fresh context, same storage backing)
// and asserts XP/mastery/streak survived. Also asserts a blocked-storage boot
// doesn't throw and raises the warning flag.
// Run: node tools/persist-test.js
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..");
const dataSrc = fs.readFileSync(path.join(DIR, "data.js"), "utf8")
  .replace("const DATA", "globalThis.DATA");
eval(dataSrc);
const appSrc = fs.readFileSync(path.join(DIR, "app.js"), "utf8");

function makeEl() {
  return {
    style: {}, innerHTML: "", textContent: "", value: "",
    dataset: {}, onclick: null, onsubmit: null,
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    focus: () => {},
  };
}
function makeStorage(backing, throwing) {
  return {
    getItem: (k) => { if (throwing) throw new Error("blocked"); return backing[k] ?? null; },
    setItem: (k, v) => { if (throwing) throw new Error("blocked"); backing[k] = String(v); },
    removeItem: (k) => { delete backing[k]; },
  };
}
function boot(backing, throwing) {
  const els = {};
  const listeners = {};
  const documentStub = {
    getElementById: (id) => {
      if (id === "mode") return { value: "flash" };
      if (id === "dir") return { value: "af-en" };
      if (!els[id]) els[id] = makeEl();
      return els[id];
    },
    querySelectorAll: () => [],
    addEventListener: (t, fn) => { listeners[t] = fn; },
  };
  class AudioStub { pause() {} play() { return { catch() {} }; } }
  const factory = new Function(
    "localStorage", "document", "Audio", "navigator", "alert", "confirm", "prompt", "DATA",
    appSrc + "\nreturn { store: () => store, saveBlocked: () => saveBlocked };"
  );
  const api = factory(
    makeStorage(backing, throwing), documentStub, AudioStub, {},
    () => {}, () => true, () => null, globalThis.DATA
  );
  return { api, els, listeners };
}
function assert(cond, msg) {
  if (!cond) { console.error("FAIL: " + msg); process.exitCode = 1; }
  else console.log("ok: " + msg);
}
const keydown = (listeners) => listeners.keydown({ key: "3", code: "", preventDefault() {} });

// --- Scenario 1: study, close, reopen ---
const backing = {};
let t = boot(backing, false);
assert(t.els.xp.textContent === "⭐ 0 XP", "fresh boot shows 0 XP");
t.els.startAll.onclick();               // start flash session (10 cards)
for (let i = 0; i < 10; i++) keydown(t.listeners);  // grade "knew it" x10
const saved = JSON.parse(backing["afrikaansLeerV1"]);
assert(saved.xp === 100, `XP persisted (got ${saved.xp}, want 100)`);
assert(Object.keys(saved.mastery).length === 10, `10 cards tracked (got ${Object.keys(saved.mastery).length})`);
assert(typeof saved.lastStudied === "string", "lastStudied recorded");

// "restart": brand-new context, same browser storage
t = boot(backing, false);
assert(t.els.xp.textContent === "⭐ 100 XP", `XP restored after reopen (got "${t.els.xp.textContent}")`);
assert(t.els.started.textContent === "📚 10 started", `started restored (got "${t.els.started.textContent}")`);
assert(/🔥 1 day streak/.test(t.els.streak.textContent), `streak restored (got "${t.els.streak.textContent}")`);
assert(/last studied/.test(t.els["view-home"].innerHTML), "home shows last-studied note");
assert(/Continue — review weakest/.test(t.els["view-home"].innerHTML), "home offers Continue button");

// --- Scenario 2: browser blocks storage (private mode) ---
const t2 = boot({}, true);
assert(t2.api.saveBlocked() === true, "blocked storage flagged, boot did not throw");
assert(/blocking local saving/.test(t2.els["view-home"].innerHTML), "home warns when saving is blocked");
t2.els.startAll.onclick();
keydown(t2.listeners); // answering must not throw even when save fails
assert(true, "answering with blocked storage does not crash");

console.log(process.exitCode ? "RESULT: FAIL" : "RESULT: PASS");
