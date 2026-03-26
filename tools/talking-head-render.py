#!/usr/bin/env python3
"""
Talking Head Anime 3 — 오디오 기반 토킹헤드 영상 렌더.
오디오의 볼륨을 분석해서 입 벌림/닫힘 + 자연스러운 표정 애니메이션.

Usage: python3 tools/talking-head-render.py <avatar.png> <audio.wav> <output.mp4> [--fps 24]
"""

import sys
import os
import argparse
import time
import math
import numpy as np

# talking-head-anime-3 경로
THA3_PATH = os.path.expanduser("~/talking-head-anime-3-demo")
sys.path.insert(0, THA3_PATH)

import torch
from PIL import Image
from tha3.poser.modes.load_poser import load_poser
from tha3.util import extract_pytorch_image_from_filelike


def analyze_audio_volume(audio_path: str, fps: int) -> np.ndarray:
    """오디오 파일에서 프레임별 볼륨(0~1) 추출."""
    import wave
    import struct

    # WAV로 변환 (이미 WAV면 그대로)
    wav_path = audio_path
    if not audio_path.endswith(".wav"):
        wav_path = "/tmp/tha3_audio.wav"
        os.system(f'ffmpeg -y -i "{audio_path}" -ar 16000 -ac 1 -c:a pcm_s16le "{wav_path}" 2>/dev/null')

    with wave.open(wav_path, "r") as wf:
        n_frames = wf.getnframes()
        framerate = wf.getframerate()
        raw = wf.readframes(n_frames)
        samples = np.array(struct.unpack(f"<{n_frames}h", raw), dtype=np.float32)

    # 프레임별 RMS 볼륨
    samples_per_frame = framerate // fps
    n_video_frames = len(samples) // samples_per_frame
    volumes = np.zeros(n_video_frames)

    for i in range(n_video_frames):
        start = i * samples_per_frame
        end = start + samples_per_frame
        chunk = samples[start:end]
        rms = np.sqrt(np.mean(chunk ** 2)) / 32768.0
        volumes[i] = min(1.0, rms * 8.0)  # 스케일링

    # 스무딩 (입이 너무 파닥거리지 않도록)
    kernel_size = 3
    kernel = np.ones(kernel_size) / kernel_size
    volumes = np.convolve(volumes, kernel, mode="same")

    return volumes


def render_talking_head(
    avatar_path: str,
    audio_path: str,
    output_path: str,
    fps: int = 24,
    model_name: str = "separable_float",
):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Device: {device}")
    print(f"Model: {model_name}, FPS: {fps}")

    # 모델 로드 (talking-head-anime-3 디렉토리에서 실행해야 모델 경로가 맞음)
    os.chdir(THA3_PATH)
    poser = load_poser(model_name, device)

    # 아바타 이미지 로드 (512x512 RGBA)
    img = Image.open(avatar_path).convert("RGBA").resize((512, 512))
    img.save("/tmp/tha3_avatar.png")
    source_image = extract_pytorch_image_from_filelike("/tmp/tha3_avatar.png").to(device)

    # 오디오 볼륨 분석
    print("Analyzing audio volume...")
    volumes = analyze_audio_volume(audio_path, fps)
    total_frames = len(volumes)
    duration_sec = total_frames / fps
    print(f"Total frames: {total_frames} ({duration_sec:.1f}s)")

    # 프레임 생성
    print(f"Rendering {total_frames} frames...")
    frame_dir = "/tmp/tha3_frames"
    os.makedirs(frame_dir, exist_ok=True)

    start_time = time.time()

    for i in range(total_frames):
        vol = volumes[i]
        t = i / fps  # 시간 (초)

        pose = torch.zeros(1, 45, dtype=torch.float32, device=device)

        # 입 모양 (볼륨 기반)
        # mouth_aaa=26, mouth_iii=27, mouth_uuu=28, mouth_eee=29, mouth_ooo=30
        pose[0, 26] = vol * 0.8                       # aaa (주 발음)
        pose[0, 27] = vol * 0.3 * abs(math.sin(t * 5))  # iii (변화)
        pose[0, 30] = vol * 0.2 * abs(math.cos(t * 4))  # ooo (변화)

        # 눈 깜빡임 (3~5초 간격)
        blink_cycle = (t % 4.0)
        if 3.8 < blink_cycle < 4.0:
            blink_val = 1.0 - abs(blink_cycle - 3.9) * 10
            pose[0, 12] = max(0, blink_val)  # eye_wink_left
            pose[0, 13] = max(0, blink_val)  # eye_wink_right

        # 머리 미세 움직임 (자연스러운 흔들림)
        pose[0, 38] = math.sin(t * 0.5) * 0.05   # head_x
        pose[0, 39] = math.sin(t * 0.3) * 0.03   # head_y

        # 호흡
        pose[0, 44] = abs(math.sin(t * 0.8)) * 0.3  # breathing

        # 렌더 (RGBA 알파채널 보존)
        output = poser.pose(source_image, pose)[0]
        output_np = output.detach().cpu().numpy()
        output_np = np.clip(output_np * 0.5 + 0.5, 0, 1)
        # 4채널 (RGBA) 그대로 유지
        output_rgba = (output_np * 255).astype(np.uint8).transpose(1, 2, 0)

        frame = Image.fromarray(output_rgba, "RGBA" if output_rgba.shape[2] == 4 else "RGB")
        frame.save(f"{frame_dir}/frame_{i:05d}.png")

        if i % 50 == 0 and i > 0:
            elapsed = time.time() - start_time
            fps_actual = i / elapsed
            remaining = (total_frames - i) / fps_actual
            print(f"  {i}/{total_frames} ({fps_actual:.1f} fps, ~{remaining / 60:.1f}min remaining)")

    elapsed = time.time() - start_time
    print(f"Rendered {total_frames} frames in {elapsed:.0f}s ({total_frames / elapsed:.1f} fps)")

    # ffmpeg로 프레임 → 알파 포함 비디오 (mov+png codec으로 알파 유지)
    print("Encoding video with alpha...")
    ffmpeg = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
    if not os.path.exists(ffmpeg):
        ffmpeg = "ffmpeg"

    # 알파 포함 MOV (overlay 합성용)
    alpha_mov = output_path.replace(".mp4", "-alpha.mov")
    cmd = (
        f'{ffmpeg} -y -framerate {fps} -i "{frame_dir}/frame_%05d.png" '
        f'-i "{audio_path}" '
        f'-c:v png -c:a aac -shortest '
        f'"{alpha_mov}"'
    )
    os.system(cmd)

    # 일반 MP4도 생성 (단독 재생용)
    cmd2 = (
        f'{ffmpeg} -y -framerate {fps} -i "{frame_dir}/frame_%05d.png" '
        f'-i "{audio_path}" '
        f'-c:v libx264 -crf 23 -pix_fmt yuv420p -c:a aac -shortest '
        f'"{output_path}"'
    )
    os.system(cmd2)

    # 정리
    os.system(f"rm -rf {frame_dir}")
    print(f"✅ Saved: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Talking Head Anime 3 Renderer")
    parser.add_argument("avatar", help="Avatar image (PNG, 512x512 recommended)")
    parser.add_argument("audio", help="Audio file (WAV/M4A)")
    parser.add_argument("output", help="Output video (MP4)")
    parser.add_argument("--fps", type=int, default=24, help="Output FPS (default: 24)")
    parser.add_argument("--model", default="separable_float", help="Model variant")
    args = parser.parse_args()

    render_talking_head(
        os.path.abspath(args.avatar),
        os.path.abspath(args.audio),
        os.path.abspath(args.output),
        args.fps,
        args.model,
    )
