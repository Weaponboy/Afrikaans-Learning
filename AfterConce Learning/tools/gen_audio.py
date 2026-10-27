"""Generate native Afrikaans pronunciation clips for the app.

Voice: Microsoft Edge `af-ZA-AdriNeural` (female, neural), slowed -10% for learners.
Incremental + order-safe: filenames are content-addressed (md5 of the phrase id),
so words/sentences can be inserted or reordered in data.js without re-mapping old
files. Clips already generated (tracked in audio/manifest.json) are reused; only
new phrases are downloaded. Works offline afterwards — MP3s are bundled in ../audio/.

Usage:
    pip install edge-tts
    python tools/gen_audio.py                 # generate missing only
    python tools/gen_audio.py --force         # regenerate everything
    python tools/gen_audio.py --voice af-ZA-WillemNeural   # male voice instead
"""
import argparse
import asyncio
import hashlib
import json
import sys
from pathlib import Path

import edge_tts

HERE = Path(__file__).resolve().parent
PHRASES = json.loads((HERE / "phrases.json").read_text(encoding="utf-8"))
AUDIO_DIR = HERE.parent / "audio"


def filename_for(pid: str) -> str:
    # Stable name regardless of order or inserted entries.
    prefix = "s" if pid.startswith("s:") else "w"
    digest = hashlib.md5(pid.encode("utf-8")).hexdigest()[:10]
    return f"{prefix}_{digest}.mp3"


async def gen_one(sem, voice, rate, pid, text, force, reuse):
    fname = filename_for(pid)
    out = AUDIO_DIR / fname
    if not force:
        if pid in reuse and (AUDIO_DIR / Path(reuse[pid]).name).exists():
            return pid, reuse[pid], "skip"
        if out.exists() and out.stat().st_size > 1000:
            return pid, "audio/" + fname, "skip"
    last = ""
    for attempt in range(4):  # the service occasionally 403s bursts; back off and retry
        async with sem:
            try:
                await edge_tts.Communicate(text, voice, rate=rate).save(str(out))
                await asyncio.sleep(0.5)
                return (pid, "audio/" + fname, "ok")
            except Exception as e:  # noqa: BLE001
                last = f"ERR {e}"
                out.unlink(missing_ok=True)
        await asyncio.sleep(2 * (attempt + 1))
    return (pid, fname, last)


async def main(voice, rate, force, jobs):
    AUDIO_DIR.mkdir(exist_ok=True)
    reuse = {}
    mf = AUDIO_DIR / "manifest.json"
    if mf.exists():
        try:
            reuse = json.loads(mf.read_text(encoding="utf-8"))
        except Exception:
            reuse = {}
    sem = asyncio.Semaphore(jobs)
    tasks = [gen_one(sem, voice, rate, p["id"], p["text"], force, reuse) for p in PHRASES]
    results = await asyncio.gather(*tasks)
    manifest = {}
    errors = 0
    for pid, fname, status in results:
        if status.startswith("ERR"):
            errors += 1
            print(f"FAIL {pid}: {status}")
        else:
            manifest[pid] = fname
    mf.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    # JS manifest inlined via <script> (file:// blocks fetch, so no runtime fetch)
    js = "const AUDIO_FILES = " + json.dumps(manifest, ensure_ascii=False) + ";\n"
    (HERE.parent / "audio-manifest.js").write_text(js, encoding="utf-8")
    # Cleanup: remove orphaned clips no longer referenced by the manifest.
    keep = {Path(v).name for v in manifest.values()}
    removed = 0
    for f in AUDIO_DIR.glob("*.mp3"):
        if f.name not in keep:
            f.unlink()
            removed += 1
    ok = sum(1 for r in results if r[2] == "ok")
    skipped = sum(1 for r in results if r[2] == "skip")
    print(f"done: {ok} generated, {skipped} reused/skipped, {errors} failed, {len(manifest)} in manifest, {removed} orphans removed")
    return 1 if errors else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="af-ZA-AdriNeural")
    ap.add_argument("--rate", default="-10%")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    args = ap.parse_args()
    sys.exit(asyncio.run(main(args.voice, args.rate, args.force, args.jobs)))
