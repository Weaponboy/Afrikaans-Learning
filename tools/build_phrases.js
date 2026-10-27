// Rebuilds tools/phrases.json from data.js — the input list for gen_audio.py.
// Run this BEFORE `python tools/gen_audio.py` whenever data.js changes.
// Also bumps the ?v=N cache-busting version in index.html, so browsers refetch
// changed files after you redeploy (GitHub Pages/CDN caches by URL).
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

// Cache-busting: bump every ?v=N in ../index.html to max+1 so browsers treat the
// asset URLs as new and refetch them instead of serving the old cached copies.
function bumpCacheVersion() {
  const index = path.join(__dirname, "..", "index.html");
  if (!fs.existsSync(index)) return;
  let html = fs.readFileSync(index, "utf8");
  const versions = [...html.matchAll(/\?v=(\d+)/g)].map(m => Number(m[1]));
  if (!versions.length) {
    console.log("index.html: no ?v= cache-bust tags found (on the styles.css/app.js/data.js/audio-manifest.js URLs) — nothing to bump");
    return;
  }
  const next = Math.max(...versions) + 1;
  html = html.replace(/\?v=\d+/g, `?v=${next}`);
  fs.writeFileSync(index, html);
  console.log(`index.html: bumped asset version to ?v=${next} (${versions.length} references)`);
}
bumpCacheVersion();
