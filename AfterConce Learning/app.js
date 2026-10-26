// Afrikaans Leer — local flashcard + sentence trainer. No deps. State in localStorage.
const KEY = "afrikaansLeerV1";
const SESSION_LEN = 10;

function defaultStore() { return { xp: 0, streak: { count: 0, last: null }, mastery: {}, seen: 0, correct: 0, lastStudied: null }; }
// Probe once at boot: private windows / blocked cookies make setItem throw.
function storageOK() {
  try { localStorage.setItem(KEY + ":probe", "1"); localStorage.removeItem(KEY + ":probe"); return true; }
  catch { return false; }
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object" || typeof s.mastery !== "object") return null;
    return { ...defaultStore(), ...s, streak: { ...defaultStore().streak, ...(s.streak || {}) } };
  } catch { return null; }
}
// Never throws: if the browser blocks storage we flag it and the home screen warns.
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); saveBlocked = false; }
  catch { saveBlocked = true; }
}
let store = load() || defaultStore();
let session = null;
let saveBlocked = !storageOK();
save(); // persist defaults so a first-run state exists
function todayStr() { return new Date().toISOString().slice(0, 10); }
function touchStreak() {
  const t = todayStr(), last = store.streak.last;
  if (last === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  store.streak.count = (last === y) ? store.streak.count + 1 : 1;
  store.streak.last = t;
  save();
}
function level() { return 1 + Math.floor(store.xp / 200); }
function masteryOf(id) { return store.mastery[id] || 0; }
function bumpMastery(id, ok) {
  const m = masteryOf(id);
  store.mastery[id] = ok ? Math.min(5, m + 1) : Math.max(0, m - 1);
}
const LEARNED_AT = 2;  // visible progress after ~2 correct recalls
const MASTERED_AT = 4; // 0–5 scale, mastered near the top
function countAt(threshold) { return Object.values(store.mastery).filter(v => v >= threshold).length; }
function startedCount() { return countAt(1); }
function learnedCount() { return countAt(LEARNED_AT); }
function masteredCount() { return countAt(MASTERED_AT); }

// Native Afrikaans audio: pre-generated clips (audio/*.mp3, voice af-ZA-AdriNeural)
// play first; device speechSynthesis is only a fallback (often an English voice).
// id = phrase id in AUDIO_FILES (audio-manifest.js), or null for non-Afrikaans text.
const _player = new Audio();
function speak(text, id) {
  const file = (id && typeof AUDIO_FILES !== "undefined") ? AUDIO_FILES[id] : null;
  if (file) {
    try {
      _player.pause();
      _player.src = file;
      const p = _player.play();
      if (p && p.catch) p.catch(() => fallbackSpeak(text));
      return;
    } catch { /* fall through to device speech */ }
  }
  fallbackSpeak(text);
}
// Speak the Afrikaans side of a card (clip when available).
function speakCard(card, d, englishFallback) {
  const t = card.isSent ? card.af : (d === "af-en" ? card.af : englishFallback);
  speak(t, t === card.af ? card.id : null);
}
function fallbackSpeak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "af-ZA"; u.rate = 0.9;
    try {
      const vs = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
      const af = vs.find(v => (v.lang || "").toLowerCase().startsWith("af"));
      if (af) u.voice = af;
    } catch { /* voice pick optional */ }
    speechSynthesis.speak(u);
  } catch {}
}
function norm(s) { return (s || "").trim().toLowerCase().replace(/[?.!,;:'"„]/g, "").replace(/\s+/g, " "); }

// ---------- HOME ----------
function allWords() {
  const out = [];
  DATA.categories.forEach(c => c.words.forEach(w => out.push({ ...w, cat: c.id, catName: c.name, id: "w:" + c.id + ":" + w.af }))); 
  return out;
}
function renderHome() {
  touchStreak();
  document.getElementById("view-study").style.display = "none";
  const home = document.getElementById("view-home");
  home.style.display = "block";
  const words = allWords();
  const cats = DATA.categories.map(c => {
    const ids = c.words.map(w => "w:" + c.id + ":" + w.af);
    const started = ids.filter(id => masteryOf(id) >= 1).length;
    const learned = ids.filter(id => masteryOf(id) >= LEARNED_AT).length;
    const mastered = ids.filter(id => masteryOf(id) >= MASTERED_AT).length;
    const pct = Math.round(100 * learned / ids.length);
    return { ...c, total: ids.length, started, learned, mastered, pct };
  });
  const sentIds = DATA.sentences.map(s => "s:" + s.af);
  const sentsStarted = sentIds.filter(id => masteryOf(id) >= 1).length;
  const sentsMastered = sentIds.filter(id => masteryOf(id) >= MASTERED_AT).length;
  const saveNote = saveBlocked
    ? `<div class="feedback no">⚠️ This browser is blocking local saving (private window, or cookies/site data blocked) — progress will NOT survive a restart. Use a normal window with site data allowed.</div>`
    : (store.seen
      ? `<p class="small">💾 Progress saved in this browser${store.lastStudied ? " · last studied " + store.lastStudied : ""} — close and reopen anytime, no account needed.</p>`
      : `<p class="small">💾 Progress auto-saves in this browser — close and reopen anytime, no account needed.</p>`);
  home.innerHTML = `
    <div class="panel">
      <h2>Start learning — pick where to begin</h2>
      ${saveNote}
      <p class="small">Path: words → phrases → full sentences. ${words.length} words · ${DATA.sentences.length} sentences · ${DATA.tips.length} tips. Review uses simple spaced repetition (weak cards resurface first).</p>
      ${startedCount() ? `<div class="row" style="justify-content:flex-start"><button class="good" id="cont">▶ Continue — review weakest (${startedCount()} started)</button></div>` : ``}
      <div class="row" style="justify-content:flex-start">
        <label>Mode:
          <select id="mode">
            <option value="flash">🃏 Flashcards (flip + self-grade)</option>
            <option value="mc">🔘 Multiple choice</option>
            <option value="type">⌨️ Type the answer</option>
            <option value="sentences">💬 Sentences: compare EN ↔ AF</option>
            <option value="cloze">✏️ Sentence cloze (fill the blank)</option>
            <option value="review">🔁 Smart review (weakest first)</option>
          </select>
        </label>
        <label>Direction:
          <select id="dir">
            <option value="af-en">See Afrikaans → recall English</option>
            <option value="en-af">See English → recall Afrikaans</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <button id="startAll" class="good">▶ Start from beginning (all)</button>
      </div>
    </div>
    <div class="panel">
      <h3>Categories</h3>
      <div class="grid">${cats.map(c => `
        <div class="cat-card">
          <strong>${c.icon} ${c.name}</strong>
          <div class="bar-label"><span>${c.started}/${c.total} started · ${c.mastered} mastered</span><span>${c.pct}%</span></div>
          <div class="progress"><div style="width:${c.pct}%"></div></div>
          <button class="ghost" data-cat="${c.id}">Study ${c.name}</button>
        </div>`).join("")}
      </div>
    </div>
    <div class="panel">
      <h3>💬 Sentences (${sentsStarted}/${DATA.sentences.length} started · ${sentsMastered} mastered)</h3>
      <p class="small">Full-sentence immersion — compare Afrikaans side-by-side with English, then cloze-test yourself.</p>
      <div class="row" style="justify-content:flex-start">
        <button data-sent="1">Study sentences</button>
        <button class="warn" data-cloze="1">Cloze test</button>
      </div>
    </div>
    <div class="panel">
      <h3>💡 Quick tips</h3>
      ${DATA.tips.map(t => `<p><strong>${t.title}:</strong> ${t.note}</p>`).join("")}
      <div class="row" style="justify-content:flex-start">
        <button class="ghost" id="reset">Reset all progress</button>
        <button class="ghost" id="export">Export progress</button>
        <button class="ghost" id="import">Import progress</button>
      </div>
    </div>`;
  document.getElementById("startAll").onclick = () => startSession({ mode: val("mode"), dir: val("dir"), cat: "all" });
  home.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => startSession({ mode: val("mode"), dir: val("dir"), cat: b.dataset.cat }));
  home.querySelector("[data-sent]").onclick = () => startSession({ mode: "sentences", dir: "mixed", cat: "all" });
  home.querySelector("[data-cloze]").onclick = () => startSession({ mode: "cloze", dir: "mixed", cat: "all" });
  const cont = document.getElementById("cont");
  if (cont) cont.onclick = () => startSession({ mode: "review", dir: val("dir"), cat: "all" });
  document.getElementById("reset").onclick = () => { if (confirm("Reset all progress?")) { store = defaultStore(); save(); renderHome(); updateHeader(); } };
  document.getElementById("export").onclick = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(store)); alert("Progress JSON copied to clipboard."); }
    catch { prompt("Copy your progress JSON:", JSON.stringify(store)); }
  };
  document.getElementById("import").onclick = () => {
    const raw = prompt("Paste a previously exported progress JSON:");
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (!s || typeof s !== "object" || typeof s.mastery !== "object") throw 0;
      store = { ...defaultStore(), ...s, streak: { ...defaultStore().streak, ...(s.streak || {}) } };
      save(); renderHome(); updateHeader(); alert("Progress restored. 💾");
    } catch { alert("That doesn't look like valid progress data."); }
  };
  updateHeader();
}
function val(id) { return document.getElementById(id).value; }

function updateHeader() {
  document.getElementById("streak").textContent = `🔥 ${store.streak.count} day streak`;
  document.getElementById("xp").textContent = `⭐ ${store.xp} XP`;
  document.getElementById("level").textContent = `Level ${level()}`;
  document.getElementById("started").textContent = `📚 ${startedCount()} started`;
  document.getElementById("mastered").textContent = `✅ ${masteredCount()} mastered`;
}

// ---------- SESSION ----------
function pickCards(cat, mode) {
  let pool;
  if (mode === "sentences" || mode === "cloze") {
    pool = DATA.sentences.map(s => ({ ...s, id: "s:" + s.af, isSent: true }));
  } else {
    pool = allWords();
    if (cat !== "all") pool = pool.filter(c => c.cat === cat);
    if (mode === "review") pool = [...pool].sort((a, b) => masteryOf(a.id) - masteryOf(b.id));
  }
  // shuffle, but for review weakest-first already sorted — take top N then shuffle lightly
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
  if (mode === "review") pool = [...pool].sort((a, b) => masteryOf(a.id) - masteryOf(b.id)).slice(0, SESSION_LEN);
  return pool.slice(0, SESSION_LEN);
}

function startSession({ mode, dir, cat }) {
  const cards = pickCards(cat, mode);
  if (!cards.length) { alert("No cards found."); return; }
  session = { mode, dir, cat, cards, i: 0, ok: 0, results: [], xpBefore: store.xp };
  document.getElementById("view-home").style.display = "none";
  const v = document.getElementById("view-study");
  v.style.display = "block";
  renderCard();
}

function dirFor(card) {
  if (session.dir === "mixed") return Math.random() < 0.5 ? "af-en" : "en-af";
  return session.dir;
}
function xpFor() { return session.mode === "cloze" ? 30 : session.mode === "sentences" ? 20 : session.mode === "type" ? 20 : 10; }

function cardState() {
  const card = session.cards[session.i];
  return { card, d: card.isSent ? "af-en" : dirFor(card) };
}

function renderCard(flipped = false, answered = null) {
  const v = document.getElementById("view-study");
  const { card, d } = cardState();
  const n = session.cards.length;
  const front = card.isSent ? (d === "af-en" ? card.af : card.en) : (d === "af-en" ? card.af : card.en);
  const back = card.isSent ? (d === "af-en" ? card.en : card.af) : (d === "af-en" ? card.en : card.af);
  const frontLang = (d === "af-en") ? (card.isSent ? "Afrikaans" : "Afrikaans 🇿🇦") : "English 🇬🇧";
  const backLang = (d === "af-en") ? "English 🇬🇧" : "Afrikaans 🇿🇦";
  const pct = Math.round(100 * session.i / n);

  let body = "";
  if (session.mode === "flash" || session.mode === "sentences" || session.mode === "review") {
    body = `
      <div class="flash" id="flip">
        <div class="sub">${frontLang} · card ${session.i + 1}/${n} ${card.isSent ? "· sentence" : ""}</div>
        <div class="big">${escapeHtml(front)}</div>
        ${flipped ? `<hr style="width:100%;border-color:#334155"><div class="sub">${backLang}</div><div class="big" style="font-size:1.6rem">${escapeHtml(back)}</div>` : `<div class="hint">Click card or press Space to flip</div>`}
      </div>
      <div class="row">
        <button class="ghost" id="hear">🔊 Hear it</button>
        ${flipped ? `<button class="bad" id="no">✗ Didn't know (1)</button><button class="warn" id="mid">~ Almost (2)</button><button class="good" id="yes">✓ Knew it (3)</button>` : `<button id="show">Flip</button>`}
      </div>`;
  } else if (session.mode === "mc") {
    const opts = makeOptions(card, d);
    body = `
      <div class="panel" style="text-align:center">
        <div class="sub small">${frontLang} · card ${session.i + 1}/${n} — pick the match</div>
        <div class="big" style="font-size:2rem;margin:12px 0">${escapeHtml(front)}</div>
        <button class="ghost" id="hear">🔊 Hear it</button>
      </div>
      <div class="mc">${answered ? answered.html : opts.map((o, i) => `<button class="ghost" data-opt="${i}">${escapeHtml(o)}</button>`).join("")}</div>
      ${answered ? `<div class="feedback ${answered.ok ? "ok" : "no"}">${answered.msg}</div><div class="row"><button id="next">Next →</button></div>` : ""}`;
  } else if (session.mode === "type" || session.mode === "cloze") {
    let prompt, answer;
    if (session.mode === "cloze" && card.isSent) {
      const blanked = makeCloze(card.af);
      prompt = blanked.display; answer = blanked.answer;
      body = clozeBody(card, prompt, answered, answer);
    } else {
      prompt = front; answer = back;
      body = typeBody(card, frontLang, prompt, answered, answer, backLang, back);
    }
  }

  v.innerHTML = `
    <div class="bar-label"><span>${escapeHtml(sessionTitle())}</span><span>${session.i + 1} / ${n} · ✅ ${session.ok}</span></div>
    <div class="progress"><div style="width:${pct}%"></div></div>
    ${body}
    <div class="row"><button class="ghost" id="quit">← Quit to home</button></div>`;

  document.getElementById("quit").onclick = renderHome;
  const hear = document.getElementById("hear");
  if (hear) hear.onclick = (e) => { e.stopPropagation(); speakCard(card, d, card.en); };
  const flip = document.getElementById("flip");
  if (flip) flip.onclick = () => { if (!flipped) { renderCard(true); speakCard(card, d, card.en); } };
  const show = document.getElementById("show");
  if (show) show.onclick = () => renderCard(true);
  if (document.getElementById("no")) {
    document.getElementById("no").onclick = () => grade(false, 0);
    document.getElementById("mid").onclick = () => grade(true, 0.5);
    document.getElementById("yes").onclick = () => grade(true, 1);
  }
  v.querySelectorAll("[data-opt]").forEach(b => b.onclick = () => answerMC(card, d, back, parseInt(b.dataset.opt)));
  const next = document.getElementById("next");
  if (next) next.onclick = advance;
  const form = document.getElementById("typeform");
  if (form) {
    form.onsubmit = (e) => { e.preventDefault(); answerType(card, answer); };
    document.getElementById("typeinput")?.focus();
  }
  updateHeader();
}

function sessionTitle() {
  const m = { flash: "Flashcards", mc: "Multiple choice", type: "Type answer", sentences: "Sentences", cloze: "Cloze", review: "Smart review" };
  return (m[session.mode] || session.mode) + " · " + (session.cat === "all" ? "all" : session.cat);
}

function clozeBody(card, prompt, answered, answer) {
  return `
    <div class="panel" style="text-align:center">
      <div class="small">Complete the Afrikaans sentence · card ${session.i + 1}/${session.cards.length}</div>
      <div style="font-size:1.5rem;margin:12px 0">${escapeHtml(prompt)}</div>
      <div class="small">💡 ${escapeHtml(card.en)}</div>
      <div class="row"><button class="ghost" id="hear" type="button">🔊 Hear sentence</button></div>
    </div>
    ${answered ? `<div class="feedback ${answered.ok ? "ok" : "no"}">${answered.msg}<br><span class="small">Answer: ${escapeHtml(answer)} — ${escapeHtml(card.en)}</span></div><div class="row"><button id="next">Next →</button></div>`
    : `<form id="typeform"><input type="text" id="typeinput" autocomplete="off" placeholder="Type the missing word…"><div class="row"><button type="submit">Check</button></div></form>`}`;
}
function typeBody(card, frontLang, prompt, answered, answer, backLang, back) {
  return `
    <div class="panel" style="text-align:center">
      <div class="small">${escapeHtml(frontLang)} → type in ${escapeHtml(backLang)} · card ${session.i + 1}/${session.cards.length}</div>
      <div style="font-size:2rem;margin:12px 0">${escapeHtml(prompt)}</div>
      <button class="ghost" id="hear" type="button">🔊 Hear it</button>
    </div>
    ${answered ? `<div class="feedback ${answered.ok ? "ok" : "no"}">${answered.msg}<br><span class="small">Correct: ${escapeHtml(answer)}</span></div><div class="row"><button id="next">Next →</button></div>`
    : `<form id="typeform"><input type="text" id="typeinput" autocomplete="off" placeholder="Type your answer…"><div class="row"><button type="submit">Check</button></div></form>`}`;
}

function makeOptions(card, d) {
  const pool = card.isSent ? DATA.sentences : allWords();
  const key = d === "af-en" ? "en" : "af";
  const correct = card[key];
  const others = [...pool].filter(p => p[key] !== correct);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[others[i], others[j]] = [others[j], others[i]]; }
  const opts = [correct, ...others.slice(0, 3).map(o => o[key])];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[opts[i], opts[j]] = [opts[j], opts[i]]; }
  session._mcAnswer = correct;
  return opts;
}
function answerMC(card, d, back, idx) {
  const btns = [...document.querySelectorAll("[data-opt]")];
  const chosen = btns[idx].textContent;
  const ok = norm(chosen) === norm(session._mcAnswer);
  record(card.id, ok);
  const html = btns.map(b => {
    const t = b.textContent;
    const style = norm(t) === norm(session._mcAnswer) ? "good" : (t === chosen ? "bad" : "ghost");
    return `<button class="${style}" disabled>${escapeHtml(t)}</button>`;
  }).join("");
  renderCard(false, { ok, html, msg: ok ? "✅ Correct!" : `❌ Not quite — correct: ${session._mcAnswer}` });
  if (ok) speakCard(card, d, chosen);
}
function answerType(card, answer) {
  const input = document.getElementById("typeinput");
  const guess = input.value;
  const ok = norm(guess) === norm(answer);
  const close = !ok && levenshtein(norm(guess), norm(answer)) <= 2 && norm(guess).length > 2;
  const pass = ok || close;
  record(card.id, pass);
  renderCard(false, { ok: pass, msg: pass ? (ok ? "✅ Correct!" : `✅ Close enough! (you: ${guess})`) : `❌ You: ${guess || "—"}` });
  if (session.mode === "cloze" && card.isSent) speak(card.af, card.id); // replay full sentence
  else speak(answer, answer === card.af ? card.id : null);
}
function makeCloze(af) {
  const words = af.split(" ");
  let idx = words.findIndex(w => w.length > 3);
  if (idx < 0) idx = words.length - 1;
  idx = Math.floor(Math.random() * words.length); // random for variety, prefer long words
  if (words[idx].length <= 2 && words.length > 1) idx = (idx + 1) % words.length;
  const answer = words[idx].replace(/[?.!,;:'"„]/g, "");
  const display = words.map((w, i) => i === idx ? "___" : w).join(" ");
  return { display, answer };
}

function grade(ok, partial) {
  const { card } = cardState();
  record(card.id, ok, partial);
  advance();
}
function record(id, ok, partial = 1) {
  touchStreak();
  store.lastStudied = todayStr();
  store.seen++;
  if (ok) { store.correct++; session.ok += partial >= 1 ? 1 : 0.5; store.xp += Math.round(xpFor() * (partial === 0.5 ? 0.5 : 1)); }
  bumpMastery(id, ok);
  session.results.push({ id, ok });
  save();
}
function advance() {
  session.i++;
  if (session.i >= session.cards.length) return renderSummary();
  renderCard();
}
function renderSummary() {
  const v = document.getElementById("view-study");
  const total = session.cards.length;
  const ok = Math.round(session.ok * 10) / 10;
  const misses = session.results.map((r, i) => ({ ...r, card: session.cards[i] })).filter(r => !r.ok);
  v.innerHTML = `
    <div class="panel" style="text-align:center">
      <h2>Session done! 🎉</h2>
      <p style="font-size:1.3rem">${ok} / ${total} correct</p>
      <p>+${store.xp - (session.xpBefore || 0)} XP this session · 💾 saved${saveBlocked ? " (WARNING: browser blocked saving!)" : ""}</p>
      <p>Streak: 🔥 ${store.streak.count} day(s) · Total XP: ⭐ ${store.xp} · Level ${level()} · 📚 ${startedCount()} started</p>
      ${misses.length ? `<h3>Review these (${misses.length})</h3>` + misses.map(m => `<p>🇿🇦 <strong>${escapeHtml(m.card.af)}</strong> — ${escapeHtml(m.card.en)}</p>`).join("") : `<p>Perfect — nothing to review. 👏</p>`}
      <div class="row">
        <button class="good" id="again">↻ Study again</button>
        <button id="home">← Home</button>
      </div>
    </div>`;
  document.getElementById("again").onclick = () => startSession({ mode: session.mode, dir: session.dir, cat: session.cat });
  document.getElementById("home").onclick = renderHome;
  updateHeader();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return dp[m][n];
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

document.addEventListener("keydown", (e) => {
  if (document.getElementById("view-study").style.display === "none") return;
  if (e.code === "Space" && session && ["flash", "sentences", "review"].includes(session.mode)) { e.preventDefault(); const f = document.getElementById("flip"); if (f && !document.getElementById("yes")) renderCard(true); }
  if (document.getElementById("yes")) {
    if (e.key === "1") grade(false, 0);
    if (e.key === "2") grade(true, 0.5);
    if (e.key === "3") grade(true, 1);
  }
});

renderHome();
