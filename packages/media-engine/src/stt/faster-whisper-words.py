#!/usr/bin/env python3
"""
faster-whisper CPU transcriber → ShortWord[] JSON.

MimikaStudio TTS 직후 whisper-cli(ggml Metal)가 exit code 3 크래시.
Metal GPU 충돌 회피를 위해 faster-whisper + CTranslate2 (CPU only)로 대체.

Usage:
  python faster-whisper-words.py <audio_path>
    --output <output_json_path>
    [--language en|es|...]
    [--model base|tiny|small]
    [--fps 30]
"""
import sys
import json
import argparse
import re


def is_punctuation_only(text: str) -> bool:
    return bool(re.fullmatch(r"[.,!?;:…\-–—'\"()\[\]{}]+", text))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path")
    parser.add_argument("--output", required=True)
    parser.add_argument("--language", default="en")
    parser.add_argument("--model", default="base")
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError:
        print("faster-whisper not installed", file=sys.stderr)
        sys.exit(1)

    # Force CPU to avoid Metal GPU conflict with MimikaStudio TTS
    model = WhisperModel(
        args.model,
        device="cpu",
        compute_type="int8",
    )

    segments, _info = model.transcribe(
        args.audio_path,
        language=args.language,
        word_timestamps=True,
        beam_size=5,
    )

    words: list[dict] = []
    for segment in segments:
        if not segment.words:
            # no word-level: use segment boundaries
            text = segment.text.strip()
            if text:
                words.append({
                    "text": text,
                    "startFrame": round(segment.start * args.fps),
                    "endFrame": round(segment.end * args.fps),
                })
            continue

        for word in segment.words:
            text = word.word.strip()
            if not text:
                continue
            # merge punctuation-only tokens into previous word
            if is_punctuation_only(text) and words:
                words[-1]["text"] += text
                words[-1]["endFrame"] = max(
                    words[-1]["endFrame"],
                    round(word.end * args.fps),
                )
                continue
            words.append({
                "text": text,
                "startFrame": round(word.start * args.fps),
                "endFrame": round(word.end * args.fps),
            })

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(words, f, indent=2, ensure_ascii=False)

    print(f"[faster-whisper] {len(words)} words → {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
