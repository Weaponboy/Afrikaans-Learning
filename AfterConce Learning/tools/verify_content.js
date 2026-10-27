// Sanity checks after content/audio changes. Usage: node tools/verify_content.js
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..");
const dataSrc = fs.readFileSync(path.join(DIR, "data.js"), "utf8");
const DATA = new Function(`${dataSrc}; return DATA;`)();
const phrases = JSON.parse(fs.readFileSync(path.join(__dirname, "phrases.json"), "utf8"));
const mfSrc = fs.readFileSync(path.join(DIR, "audio-manifest.js"), "utf8");
const manifest = JSON.parse(mfSrc.slice(mfSrc.indexOf("{")).replace(/;\s*$/, ""));

let problems = 0;
const fail = (msg) => { problems++; console.log("FAIL " + msg); };

const words = DATA.categories.reduce((n, c) => n + c.words.length, 0);
console.log(`content: ${words} words in ${DATA.categories.length} categories, ${DATA.sentences.length} sentences, ${DATA.tips.length} tips`);

// duplicate ids
const ids = new Set();
DATA.categories.forEach(c => c.words.forEach(w => {
  const id = `w:${c.id}:${w.af}`;
  if (ids.has(id)) fail(`dup id ${id}`);
  ids.add(id);
}));
DATA.sentences.forEach(s => {
  const id = `s:${s.af}`;
  if (ids.has(id)) fail(`dup id ${id}`);
  ids.add(id);
});

// manifest covers every phrase, files exist and are non-trivial
if (manifest.length !== undefined) {} // plain object
const mKeys = Object.keys(manifest);
if (mKeys.length !== phrases.length) fail(`manifest ${mKeys.length} != phrases ${phrases.length}`);
phrases.forEach(p => {
  const f = manifest[p.id];
  if (!f) return fail(`no manifest entry for ${p.id}`);
  const full = path.join(DIR, f);
  if (!fs.existsSync(full)) return fail(`missing file ${f} (${p.id})`);
  if (fs.statSync(full).size < 1000) fail(`tiny file ${f} (${p.id})`);
});

// orphan mp3s
const keep = new Set(Object.values(manifest).map(v => path.basename(v)));
const orphans = fs.readdirSync(path.join(DIR, "audio")).filter(f => f.endsWith(".mp3") && !keep.has(f));
if (orphans.length) fail(`${orphans.length} orphan mp3s: ${orphans.slice(0, 5).join(", ")}…`);

console.log(problems ? `RESULT: ${problems} problem(s)` : "RESULT: ALL OK");
process.exit(problems ? 1 : 0);
