# 🇿🇦 Afrikaans Leer — free local flashcards

No account. No subscription. Runs offline in your browser. Just double-click `index.html`.

## Run
1. Open the folder `Afrikaans learning app`
2. Double-click **`index.html`** (opens in Chrome / Edge / Firefox)
3. Pick a mode + category → study. Progress auto-saves in the browser.

No install, no server, no Python needed.

## What's inside
- **100 words** in 7 categories (greetings → numbers → family → food → travel → verbs → adjectives)
- **25 full sentences** (introductions, shopping, directions, help)
- **6 modes**: Flashcards · Multiple choice · Type answer · Sentences (EN↔AF compare) · Cloze (fill blank) · Smart review (weakest first)
- **Progress**: XP, levels (200 XP/level), daily streak, per-word mastery 0–5, per-category % bars
- **Audio**: 125 pre-generated native Afrikaans clips (`audio/`, voice `af-ZA-AdriNeural`, slowed -10% for learners) — plays offline, no internet needed. Falls back to device speech only if a clip is missing.
- Keyboard: `Space` flip, `1/2/3` = didn't/almost/knew

## Progress (no account, fully local)
Every answer auto-saves to the browser (`localStorage` key `afrikaansLeerV1`): XP, streak, per-card mastery, last-studied date. Close the app and reopen — it resumes. Category bars move from your first session (`started`), `mastered` needs ~4 correct recalls. If the browser blocks site data (private window), the home screen warns you instead of silently losing progress. Export/Import buttons on the home screen back up or move progress between browsers. Verify anytime: `node tools/persist-test.js`.

## Regenerating audio (optional)
Clips were generated once with the free `edge-tts` package (Microsoft Edge neural voices, no API key).
To regenerate (e.g. after adding words in `data.js`):
```
pip install edge-tts
python tools/gen_audio.py            # new/missing clips only
python tools/gen_audio.py --force    # rebuild all 125
```
Voice credit: Microsoft `af-ZA-AdriNeural`. Alternative male voice: `--voice af-ZA-WillemNeural`. Personal/educational use.

## Inspired by (research)
Duolingo (streak/XP/path), Anki (spaced repetition, know/don't-know grading), Memrise/Clozemaster (cloze sentences, active recall), Ling/Mondly (topic packs, short lessons).

## Files
`index.html` · `styles.css` · `app.js` · `data.js`

## Reset / backup
- Reset button on home clears `localStorage` key `afrikaansLeerV1`.
- Export button copies progress JSON to clipboard.
