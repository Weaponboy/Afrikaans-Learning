"""Generate native Afrikaans pronunciation clips for the app.

Voice: Microsoft Edge `af-ZA-AdriNeural` (female, neural), slowed -10% for learners.
One-time generation; output MP3s are bundled in ../audio/ and work offline.

Usage:
    pip install edge-tts
    python tools/gen_audio.py                 # generate missing only
    python tools/gen_audio.py --force         # regenerate all
    python tools/gen_audio.py --voice af-ZA-WillemNeural   # male voice instead
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

HERE = Path(__file__).resolve().parent
PHRASES = json.loads((HERE / "phrases.json").read_text(encoding="utf-8"))
AUDIO_DIR = HERE.parent / "audio"


def filename_for(index: int, pid: str) -> str:
    prefix = "s" if pid.startswith("s:") else "w"
    return f"{prefix}{index:04d}.mp3"


async def gen_one(sem, voice, rate, index, pid, text, force):
    fname = filename_for(index, pid)
    out = AUDIO_DIR / fname
    if out.exists() and not force:
        return (pid, fname, "skip")
    async with sem:
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(str(out))
            await asyncio.sleep(0.3)
            return (pid, fname, "ok")
        except Exception as e:  # noqa: BLE001
            return (pid, fname, f"ERR {e}")


async def main(voice, rate, force, jobs):
    AUDIO_DIR.mkdir(exist_ok=True)
    sem = asyncio.Semaphore(jobs)
    tasks = [
        gen_one(sem, voice, rate, i + 1, p["id"], p["text"], force)
        for i, p in enumerate(PHRASES)
    ]
    results = await asyncio.gather(*tasks)
    manifest = {}
    errors = 0
    for pid, fname, status in results:
        if status.startswith("ERR"):
            errors += 1
            print(f"FAIL {pid}: {status}")
        else:
            manifest[pid] = "audio/" + fname
    (AUDIO_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    # JS manifest inlined via <script> (file:// blocks fetch, so no runtime fetch)
    js = "const AUDIO_FILES = " + json.dumps(manifest, ensure_ascii=False) + ";\n"
    (HERE.parent / "audio-manifest.js").write_text(js, encoding="utf-8")
    ok = sum(1 for r in results if r[2] == "ok")
    skipped = sum(1 for r in results if r[2] == "skip")
    print(f"done: {ok} generated, {skipped} skipped, {errors} failed, {len(manifest)} in manifest")
    return 1 if errors else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="af-ZA-AdriNeural")
    ap.add_argument("--rate", default="-10%")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=4)
    args = ap.parse_args()
    sys.exit(asyncio.run(main(args.voice, args.rate, args.force, args.jobs)))
