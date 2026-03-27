/**
 * VibeHub 브랜드 인트로/아웃트로 — Remotion Composition.
 * 인트로: 로고 fade-in + 타이틀 (3초)
 * 아웃트로: CTA + 소셜 링크 (5초)
 */

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";

// ---------------------------------------------------------------------------
// 공통 스타일
// ---------------------------------------------------------------------------

const BRAND_COLOR = "#151110";
const ACCENT_COLOR = "#D9863A";
const TEXT_COLOR = "#FFFFFF";

// ---------------------------------------------------------------------------
// 인트로 (3초, 72프레임 @24fps)
// ---------------------------------------------------------------------------

export interface IntroProps {
  title: string;
  subtitle?: string;
}

export const BrandIntro: React.FC<IntroProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 로고 스프링 애니메이션
  const logoScale = spring({ frame, fps, config: { damping: 12 } });

  // 타이틀 페이드인 (0.5초 후)
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 서브타이틀 페이드인 (1초 후)
  const subtitleOpacity = interpolate(frame, [24, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 전체 페이드아웃 (마지막 0.5초)
  const fadeOut = interpolate(frame, [60, 72], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND_COLOR,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeOut,
      }}
    >
      {/* VH 로고 */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          color: ACCENT_COLOR,
          fontSize: 80,
          fontFamily: "Inter, sans-serif",
          fontWeight: 900,
          letterSpacing: 8,
          marginBottom: 20,
        }}
      >
        VIBEHUB
      </div>

      {/* 타이틀 */}
      <div
        style={{
          opacity: titleOpacity,
          color: TEXT_COLOR,
          fontSize: 36,
          fontFamily: "Inter, sans-serif",
          fontWeight: 600,
          textAlign: "center",
          maxWidth: 900,
          lineHeight: 1.3,
          padding: "0 40px",
        }}
      >
        {title}
      </div>

      {/* 서브타이틀 */}
      {subtitle && (
        <div
          style={{
            opacity: subtitleOpacity,
            color: ACCENT_COLOR,
            fontSize: 20,
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            marginTop: 16,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 아웃트로 (5초, 120프레임 @24fps)
// ---------------------------------------------------------------------------

export interface OutroProps {
  channelName?: string;
  websiteUrl?: string;
  threadsHandle?: string;
}

export const BrandOutro: React.FC<OutroProps> = ({
  channelName = "VibeHub",
  websiteUrl = "vibehub.tech",
  threadsHandle = "@vibehub1030",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 페이드인
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA 스프링
  const ctaScale = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 10 } });

  // 소셜 링크 페이드인
  const socialOpacity = interpolate(frame, [36, 54], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 전체 페이드아웃 (5초 = 120프레임)
  const fadeOut = interpolate(frame, [108, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND_COLOR,
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeIn * fadeOut,
      }}
    >
      {/* CTA */}
      <div
        style={{
          transform: `scale(${ctaScale})`,
          color: TEXT_COLOR,
          fontSize: 48,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Subscribe for daily AI insights
      </div>

      {/* 채널명 */}
      <div
        style={{
          color: ACCENT_COLOR,
          fontSize: 64,
          fontFamily: "Inter, sans-serif",
          fontWeight: 900,
          letterSpacing: 4,
          marginBottom: 40,
        }}
      >
        {channelName.toUpperCase()}
      </div>

      {/* 소셜 링크 */}
      <div
        style={{
          opacity: socialOpacity,
          display: "flex",
          gap: 40,
          color: TEXT_COLOR,
          fontSize: 22,
          fontFamily: "Inter, sans-serif",
        }}
      >
        <span>{websiteUrl}</span>
        <span>|</span>
        <span>Threads {threadsHandle}</span>
      </div>
    </AbsoluteFill>
  );
};
