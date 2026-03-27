/**
 * BriefAudiogram — Remotion Composition.
 * 웨이브폼 + 자막 + 커버 이미지 비주얼.
 * 출력: en/es 2개 mp4 (같은 MP3, 자막만 다름)
 */

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { visualizeAudio, useAudioData } from "@remotion/media-utils";

// ---------------------------------------------------------------------------
// Props 타입
// ---------------------------------------------------------------------------

export interface AudigramSubtitle {
  startFrame: number;
  endFrame: number;
  text: string;
}

export interface BriefAudiogramProps {
  /** 오디오 파일 경로 (정적 서버 or 절대 경로) */
  audioSrc: string;
  /** 커버 이미지 경로 */
  coverImageSrc?: string;
  /** 자막 배열 */
  subtitles: AudigramSubtitle[];
  /** 브리프 제목 */
  title: string;
  /** 브랜드 색상 (기본: #151110) */
  brandColor?: string;
  /** 악센트 색상 (기본: #D9863A) */
  accentColor?: string;
}

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const WAVEFORM_BARS = 64;
const WAVEFORM_HEIGHT = 120;

// ---------------------------------------------------------------------------
// 컴포넌트
// ---------------------------------------------------------------------------

/** 웨이브폼 시각화 */
const Waveform: React.FC<{ audioSrc: string; accentColor: string }> = ({
  audioSrc,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(audioSrc);

  if (!audioData) return null;

  const visualization = visualizeAudio({
    fps,
    frame,
    audioData,
    numberOfSamples: WAVEFORM_BARS,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        height: WAVEFORM_HEIGHT,
        width: "100%",
      }}
    >
      {visualization.map((v, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: `${Math.max(4, v * WAVEFORM_HEIGHT)}px`,
            backgroundColor: accentColor,
            borderRadius: 4,
            transition: "height 0.05s ease",
          }}
        />
      ))}
    </div>
  );
};

/** 현재 자막 표시 */
const SubtitleOverlay: React.FC<{
  subtitles: AudigramSubtitle[];
}> = ({ subtitles }) => {
  const frame = useCurrentFrame();
  const current = subtitles.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame,
  );

  if (!current) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 160,
        left: 60,
        right: 60,
        textAlign: "center",
        color: "#FFFFFF",
        fontSize: 32,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        lineHeight: 1.4,
      }}
    >
      {current.text}
    </div>
  );
};

/** 메인 Audiogram Composition */
export const BriefAudiogram: React.FC<BriefAudiogramProps> = ({
  audioSrc,
  coverImageSrc,
  subtitles,
  title,
  brandColor = "#151110",
  accentColor = "#D9863A",
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: brandColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* 오디오 트랙 */}
      <Audio src={audioSrc} />

      {/* 커버 이미지 */}
      {coverImageSrc && (
        <Sequence from={0}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.3,
            }}
          >
            <Img
              src={coverImageSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </Sequence>
      )}

      {/* 타이틀 */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          right: 60,
          color: "#FFFFFF",
          fontSize: 48,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>

      {/* VibeHub 브랜드 */}
      <div
        style={{
          position: "absolute",
          top: 30,
          right: 60,
          color: accentColor,
          fontSize: 18,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          letterSpacing: 2,
        }}
      >
        VIBEHUB
      </div>

      {/* 웨이브폼 */}
      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 60,
          right: 60,
        }}
      >
        <Waveform audioSrc={audioSrc} accentColor={accentColor} />
      </div>

      {/* 자막 */}
      <SubtitleOverlay subtitles={subtitles} />
    </AbsoluteFill>
  );
};
