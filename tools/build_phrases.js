// Rebuilds tools/phrases.json from data.js — the input list for gen_audio.py.
// Run this BEFORE `python tools/gen_audio.py` whenever data.js changes.
// Usage: node tools/build_phrases.js
const fs = require("fs");
const path = require("path");

const dataSrc = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
const DATA = new Function(`${dataSrc}; return DATA;`)();

const phrases = [];
const seen = new Set();
DATA.categories.forEach(c => c.words.forEach(w => {
  const id = `w:${c.id}:${w.af}`;
  if (seen.has(id)) throw new Error(`Duplicate word id: ${id}`);
  seen.add(id);
  phrases.push({ id, text: w.af });
}));
DATA.sentences.forEach(s => {
  const id = `s:${s.af}`;
  if (seen.has(id)) throw new Error(`Duplicate sentence id: ${id}`);
  seen.add(id);
  phrases.push({ id, text: s.af });
});

const out = path.join(__dirname, "phrases.json");
fs.writeFileSync(out, JSON.stringify(phrases, null, 1) + "\n");
const words = DATA.categories.reduce((n, c) => n + c.words.length, 0);
console.log(`phrases.json: ${phrases.length} entries (${words} words, ${DATA.sentences.length} sentences)`);
