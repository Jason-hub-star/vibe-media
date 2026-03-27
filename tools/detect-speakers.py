#!/usr/bin/env python3
"""
화자 감지 — 오디오에서 프레임별 남/녀/무음 판별.
Zero Crossing Rate 기반 간이 분류.

Usage: python3 tools/detect-speakers.py <audio.wav> [--fps 24]
Output: JSON → stdout (파이프라인 연결용)
"""

import sys
import os
import json
import argparse
import struct
import wave
import numpy as np


def detect_speakers(wav_path: str, fps: int = 24) -> dict:
    with wave.open(wav_path, "r") as wf:
        n = wf.getnframes()
        rate = wf.getframerate()
        raw = wf.readframes(n)
        samples = np.array(struct.unpack(f"<{n}h", raw), dtype=np.float32)

    window = rate // 2  # 0.5초 윈도우
    step = rate // fps
    timeline = []  # "m", "f", "s" per frame

    for i in range(0, len(samples) - window, step):
        chunk = samples[i : i + window]
        rms = np.sqrt(np.mean(chunk**2))

        if rms < 300:
            timeline.append("s")
            continue

        signs = np.sign(chunk)
        crossings = np.sum(np.abs(np.diff(signs)) > 0)
        zcr_freq = crossings * rate / (2 * len(chunk))

        if zcr_freq < 2000:
            timeline.append("m")
        else:
            timeline.append("f")

    # 스무딩 (3프레임 이하 깜빡임 제거)
    smoothed = list(timeline)
    for i in range(2, len(smoothed) - 2):
        window_5 = smoothed[i - 2 : i + 3]
        majority = max(set(window_5), key=window_5.count)
        if window_5.count(smoothed[i]) <= 1:
            smoothed[i] = majority

    m_count = smoothed.count("m")
    f_count = smoothed.count("f")
    s_count = smoothed.count("s")
    total = len(smoothed)
    voice_total = m_count + f_count

    # 모드 판별
    if voice_total == 0:
        mode = "silence"
    elif m_count > voice_total * 0.8:
        mode = "male_solo"
    elif f_count > voice_total * 0.8:
        mode = "female_solo"
    else:
        mode = "dual"

    return {
        "mode": mode,
        "total_frames": total,
        "male_frames": m_count,
        "female_frames": f_count,
        "silence_frames": s_count,
        "male_pct": round(m_count / total * 100) if total > 0 else 0,
        "female_pct": round(f_count / total * 100) if total > 0 else 0,
        "timeline": "".join(smoothed),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", help="WAV file")
    parser.add_argument("--fps", type=int, default=24)
    args = parser.parse_args()

    result = detect_speakers(args.audio, args.fps)
    print(json.dumps(result, indent=2))
