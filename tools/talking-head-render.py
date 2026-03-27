#!/usr/bin/env python3
"""
Talking Head Anime 3 — 화자 감지 기반 듀얼 아바타 렌더.

모드:
  male_solo   → 남자 아바타만 렌더
  female_solo → 여자 아바타만 렌더
  dual        → 남녀 아바타 둘 다 렌더 (화자별 입 움직임)

Usage:
  python3 tools/talking-head-render.py <audio.wav> <output-dir> [options]

Options:
  --female-avatar <path>  여자 아바타 (기본: assets/brand/vh-avatar.png)
  --male-avatar <path>    남자 아바타 (기본: assets/brand/vh-avatar-male.png)
  --fps 24
  --model separable_float
"""

import sys
import os
import argparse
import time
import math
import json
import struct
import wave
import numpy as np
from PIL import Image

# talking-head-anime-3 경로
THA3_PATH = os.path.expanduser("~/talking-head-anime-3-demo")
sys.path.insert(0, THA3_PATH)

import torch
from tha3.poser.modes.load_poser import load_poser
from tha3.util import extract_pytorch_image_from_filelike

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def detect_speakers(wav_path: str, fps: int = 24) -> dict:
    """화자 감지 (detect-speakers.py와 동일 로직)."""
    with wave.open(wav_path, "r") as wf:
        n = wf.getnframes()
        rate = wf.getframerate()
        raw = wf.readframes(n)
        samples = np.array(struct.unpack(f"<{n}h", raw), dtype=np.float32)

    window = rate // 2
    step = rate // fps
    timeline = []

    for i in range(0, len(samples) - window, step):
        chunk = samples[i : i + window]
        rms = np.sqrt(np.mean(chunk**2))
        if rms < 300:
            timeline.append("s")
            continue
        signs = np.sign(chunk)
        crossings = np.sum(np.abs(np.diff(signs)) > 0)
        zcr_freq = crossings * rate / (2 * len(chunk))
        timeline.append("m" if zcr_freq < 2000 else "f")

    # 스무딩
    smoothed = list(timeline)
    for i in range(2, len(smoothed) - 2):
        w5 = smoothed[i - 2 : i + 3]
        majority = max(set(w5), key=w5.count)
        if w5.count(smoothed[i]) <= 1:
            smoothed[i] = majority

    m = smoothed.count("m")
    f = smoothed.count("f")
    v = m + f
    if v == 0:
        mode = "silence"
    elif m > v * 0.8:
        mode = "male_solo"
    elif f > v * 0.8:
        mode = "female_solo"
    else:
        mode = "dual"

    return {"mode": mode, "timeline": smoothed, "total": len(smoothed)}


def analyze_volume(wav_path: str, fps: int) -> np.ndarray:
    with wave.open(wav_path, "r") as wf:
        n = wf.getnframes()
        rate = wf.getframerate()
        raw = wf.readframes(n)
        samples = np.array(struct.unpack(f"<{n}h", raw), dtype=np.float32)

    spf = rate // fps
    total = len(samples) // spf
    vols = np.zeros(total)
    for i in range(total):
        chunk = samples[i * spf : (i + 1) * spf]
        rms = np.sqrt(np.mean(chunk**2)) / 32768.0
        vols[i] = min(1.0, rms * 8.0)
    return np.convolve(vols, np.ones(3) / 3, mode="same")


def prepare_avatar(img_path: str) -> str:
    """비율 유지 투명 패딩 512x512."""
    img = Image.open(img_path).convert("RGBA")
    new_w = 512
    new_h = int(img.height * (512 / img.width))
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.paste(img_resized, (0, 0))
    out = f"/tmp/tha3_avatar_{os.path.basename(img_path)}"
    canvas.save(out)
    return out


def make_pose(vol: float, t: float, is_speaking: bool) -> list:
    """포즈 파라미터 생성."""
    pose = [0.0] * 45

    if is_speaking:
        pose[26] = vol * 0.8  # aaa
        pose[27] = vol * 0.3 * abs(math.cos(t * 4))  # iii
        pose[30] = vol * 0.4 * abs(math.sin(t * 5))  # ooo
        pose[16] = vol * 0.2  # eye surprised L
        pose[17] = vol * 0.2  # eye surprised R

    # 깜빡임 (4초 주기)
    blink = t % 4.0
    if 3.8 < blink < 4.0:
        bv = 1.0 - abs(blink - 3.9) * 10
        pose[12] = max(0, bv)
        pose[13] = max(0, bv)

    # 머리 미세 움직임 + 호흡
    pose[38] = math.sin(t * 0.5) * 0.1
    pose[39] = math.sin(t * 0.3) * 0.06
    pose[44] = abs(math.sin(t * 0.8)) * 0.3

    return pose


def render_avatar(poser, source, vols, timeline, speaker_char, fps, frame_dir, prefix):
    """한 아바타의 전체 프레임 렌더."""
    device = source.device
    total = min(len(vols), len(timeline))

    for i in range(total):
        vol = vols[i]
        t = i / fps
        is_speaking = timeline[i] == speaker_char

        pose_vals = make_pose(vol if is_speaking else 0.0, t, is_speaking)
        pose = torch.tensor([pose_vals], dtype=torch.float32, device=device)

        output = poser.pose(source, pose)[0]
        arr = output.detach().cpu().numpy()
        arr = np.clip(arr * 0.5 + 0.5, 0, 1)
        arr = (arr * 255).astype(np.uint8).transpose(1, 2, 0)
        Image.fromarray(arr, "RGBA").save(f"{frame_dir}/{prefix}_{i:05d}.png")

        if i % 200 == 0 and i > 0:
            print(f"  {prefix}: {i}/{total}")


def frames_to_mov(frame_dir, prefix, audio_path, output_path, fps):
    ffmpeg = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
    os.system(
        f'{ffmpeg} -y -framerate {fps} -i "{frame_dir}/{prefix}_%05d.png" '
        f'-i "{audio_path}" -c:v png -c:a aac -shortest "{output_path}" 2>/dev/null'
    )


def main():
    parser = argparse.ArgumentParser(description="Talking Head Dual Avatar Renderer")
    parser.add_argument("audio", help="Audio file (WAV)")
    parser.add_argument("output_dir", help="Output directory")
    parser.add_argument(
        "--female-avatar",
        default=os.path.join(PROJECT_ROOT, "assets/brand/vh-avatar.png"),
    )
    parser.add_argument(
        "--male-avatar",
        default=os.path.join(PROJECT_ROOT, "assets/brand/vh-avatar-male.png"),
    )
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--model", default="separable_float")
    args = parser.parse_args()

    args.output_dir = os.path.abspath(args.output_dir)
    args.audio = os.path.abspath(args.audio)
    args.female_avatar = os.path.abspath(args.female_avatar)
    args.male_avatar = os.path.abspath(args.male_avatar)
    os.makedirs(args.output_dir, exist_ok=True)

    # 1. 화자 감지
    print("Detecting speakers...")
    speaker_info = detect_speakers(os.path.abspath(args.audio), args.fps)
    mode = speaker_info["mode"]
    timeline = speaker_info["timeline"]
    total = speaker_info["total"]
    print(f"Mode: {mode} | Frames: {total} ({total / args.fps:.0f}s)")

    # 2. 볼륨 분석
    vols = analyze_volume(os.path.abspath(args.audio), args.fps)
    total = min(total, len(vols))
    timeline = timeline[:total]

    # 3. 모델 로드
    os.chdir(THA3_PATH)
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    poser = load_poser(args.model, device)
    print(f"Device: {device} | Model: {args.model}")

    frame_dir = "/tmp/tha3_dual_frames"
    os.makedirs(frame_dir, exist_ok=True)

    start = time.time()

    if mode == "male_solo":
        print(f"Rendering male avatar ({total} frames)...")
        src = extract_pytorch_image_from_filelike(prepare_avatar(args.male_avatar)).to(device)
        render_avatar(poser, src, vols, timeline, "m", args.fps, frame_dir, "male")
        frames_to_mov(frame_dir, "male", args.audio, os.path.join(args.output_dir, "avatar-male-alpha.mov"), args.fps)
        # 메타 저장
        meta = {"mode": "male_solo", "avatar_mov": "avatar-male-alpha.mov"}

    elif mode == "female_solo":
        print(f"Rendering female avatar ({total} frames)...")
        src = extract_pytorch_image_from_filelike(prepare_avatar(args.female_avatar)).to(device)
        render_avatar(poser, src, vols, timeline, "f", args.fps, frame_dir, "female")
        frames_to_mov(frame_dir, "female", args.audio, os.path.join(args.output_dir, "avatar-female-alpha.mov"), args.fps)
        meta = {"mode": "female_solo", "avatar_mov": "avatar-female-alpha.mov"}

    elif mode == "dual":
        print(f"Rendering DUAL avatars ({total} frames each)...")
        src_m = extract_pytorch_image_from_filelike(prepare_avatar(args.male_avatar)).to(device)
        src_f = extract_pytorch_image_from_filelike(prepare_avatar(args.female_avatar)).to(device)

        print("  Male avatar...")
        render_avatar(poser, src_m, vols, timeline, "m", args.fps, frame_dir, "male")
        print("  Female avatar...")
        render_avatar(poser, src_f, vols, timeline, "f", args.fps, frame_dir, "female")

        frames_to_mov(frame_dir, "male", args.audio, os.path.join(args.output_dir, "avatar-male-alpha.mov"), args.fps)
        frames_to_mov(frame_dir, "female", args.audio, os.path.join(args.output_dir, "avatar-female-alpha.mov"), args.fps)
        meta = {
            "mode": "dual",
            "avatar_male_mov": "avatar-male-alpha.mov",
            "avatar_female_mov": "avatar-female-alpha.mov",
        }
    else:
        print("No speech detected, skipping avatar render.")
        meta = {"mode": "silence"}

    elapsed = time.time() - start
    meta["render_time_sec"] = round(elapsed)
    meta["total_frames"] = total
    meta["fps"] = args.fps

    # 메타 저장
    meta_path = os.path.join(args.output_dir, "avatar-meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    # 정리
    os.system(f"rm -rf {frame_dir}")

    print(f"\n✅ Done in {elapsed:.0f}s | Mode: {mode}")
    print(f"   Meta: {meta_path}")


if __name__ == "__main__":
    main()
