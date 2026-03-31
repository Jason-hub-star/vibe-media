/**
 * BriefShort V3 — 바이럴 표준 9:16 / 16:9 Composition.
 *
 * Tier 1: UPPERCASE Bold 70px + 외곽선 + 금색 배경 하이라이트 + 중앙 자막
 * Tier 2: TransitionSeries 크로스페이드 + phrase 단위 자막 (3-5 워드)
 * Tier 3: 문장별 씬 자동분할 + 롱폼 챕터 카드
 *
 * 오디오 + BGM은 ffmpeg로 후합성.
 * Shorts: 1080×1920 | Longform: 1920×1080 (같은 컴포넌트, 해상도만 다름)
 */

import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShortWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface ShortScene {
  backgroundSrc: string;
  startFrame: number;
  endFrame: number;
  kenBurns?: "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
  /** 롱폼 챕터 제목 (선택) */
  chapterTitle?: string;
  /** Pexels Video mp4 URL — 있으면 이미지 대신 비디오 배경 사용 (V4) */
  videoSrc?: string;
}

export interface BriefShortProps {
  scenes: ShortScene[];
  words: ShortWord[];
  title: string;
  brandColor?: string;
  accentColor?: string;
  ctaText?: string;
  /** 실제 영상 프레임 수 (CTA 타이밍 계산용) */
  durationInFrames?: number;
}

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const BRAND_COLOR = "#151110";
const ACCENT = "#D9863A";
const HIGHLIGHT_BG = "#FFD700";
const TRANSITION_FRAMES = 15;

// ---------------------------------------------------------------------------
// 씬 배경 + Ken Burns
// ---------------------------------------------------------------------------

const SceneBackground: React.FC<{
  scene: ShortScene;
  brandColor: string;
}> = ({ scene, brandColor }) => {
  const frame = useCurrentFrame();
  const sceneDuration = scene.endFrame - scene.startFrame;
  const progress = Math.min(1, frame / sceneDuration);

  const kb = scene.kenBurns ?? "zoom-in";
  let scale = 1;
  let tx = 0;

  if (kb === "zoom-in") {
    scale = 1 + progress * 0.15;
  } else if (kb === "zoom-out") {
    scale = 1.15 - progress * 0.15;
  } else if (kb === "pan-left") {
    scale = 1.1;
    tx = -progress * 60;
  } else if (kb === "pan-right") {
    scale = 1.1;
    tx = progress * 60;
  }

  return (
    <AbsoluteFill>
      {scene.videoSrc ? (
        <OffthreadVideo
          src={scene.videoSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translate3d(${tx}px, 0, 0)`,
          }}
          muted
        />
      ) : (
        <Img
          src={scene.backgroundSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translate3d(${tx}px, 0, 0)`,
          }}
        />
      )}
      {/* 다크 오버레이 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(
            to bottom,
            ${brandColor}cc 0%,
            ${brandColor}55 30%,
            ${brandColor}33 50%,
            ${brandColor}55 70%,
            ${brandColor}cc 100%
          )`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 씬 배경 레이어 — TransitionSeries 크로스페이드 (Tier 2 #9)
// ---------------------------------------------------------------------------

const SceneTransitionLayer: React.FC<{
  scenes: ShortScene[];
  brandColor: string;
}> = ({ scenes, brandColor }) => {
  if (scenes.length === 0) return null;

  return (
    <TransitionSeries>
      {scenes.map((scene, i) => {
        const duration = scene.endFrame - scene.startFrame + TRANSITION_FRAMES;
        return (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={duration}>
              <SceneBackground scene={scene} brandColor={brandColor} />
            </TransitionSeries.Sequence>
            {i < scenes.length - 1 && (
              <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
                presentation={fade()}
              />
            )}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};

// ---------------------------------------------------------------------------
// 워드바이워드 자막 — 바이럴 표준 (Tier 1 + Tier 2 #10)
// UPPERCASE + Bold 70px + stroke + 금색 배경 하이라이트
// phrase 단위 3-5 워드 윈도우
// ---------------------------------------------------------------------------

const TITLE_CARD_DURATION_SEC = 2.5;

const WordByWordCaptions: React.FC<{
  words: ShortWord[];
}> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // 타이틀 카드가 사라진 뒤부터 자막 표시 (겹침 방지)
  if (frame < fps * TITLE_CARD_DURATION_SEC) return null;

  const currentWordIdx = words.findIndex(
    (w) => frame >= w.startFrame && frame <= w.endFrame,
  );
  if (currentWordIdx === -1) return null;

  // phrase 단위: 현재 단어 포함 최대 4단어 윈도우
  const windowStart = Math.max(0, currentWordIdx - 1);
  const windowEnd = Math.min(words.length, windowStart + 4);
  const visibleWords = words.slice(windowStart, windowEnd);

  // 9:16이면 중앙, 16:9이면 하단 1/3
  const isPortrait = height > 1000;
  const posStyle: React.CSSProperties = isPortrait
    ? { top: "45%", transform: "translateY(-50%)" }
    : { bottom: "18%" };

  return (
    <div
      style={{
        position: "absolute",
        left: 40,
        right: 40,
        textAlign: "center",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "8px 12px",
        ...posStyle,
      }}
    >
      {visibleWords.map((word, i) => {
        const globalIdx = windowStart + i;
        const isActive = globalIdx === currentWordIdx;

        const bounceScale = isActive
          ? spring({
              frame: frame - word.startFrame,
              fps,
              config: { damping: 14, mass: 0.4, stiffness: 220 },
            })
          : 1;

        return (
          <span
            key={`${word.startFrame}-${i}`}
            style={{
              display: "inline-block",
              fontFamily: "'Montserrat', 'Inter', sans-serif",
              fontSize: isActive ? 72 : 64,
              fontWeight: 900,
              textTransform: "uppercase" as const,
              letterSpacing: 1,
              whiteSpace: "pre" as const,
              color: isActive ? "#000000" : "#FFFFFF",
              WebkitTextStroke: isActive ? "0" : "2px #000000",
              textShadow: isActive
                ? "none"
                : "0 0 12px rgba(0,0,0,0.9), 3px 3px 6px rgba(0,0,0,0.7)",
              transform: `scale(${bounceScale})`,
              // 활성 단어: 금색 배경 박스
              backgroundColor: isActive ? HIGHLIGHT_BG : "transparent",
              padding: isActive ? "6px 14px" : "2px 4px",
              borderRadius: isActive ? 10 : 0,
              lineHeight: 1.3,
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 챕터 카드 — 롱폼 전용 (Tier 3 #15)
// ---------------------------------------------------------------------------

const ChapterCard: React.FC<{
  title: string;
  accentColor: string;
}> = ({ title, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [fps * 1.2, fps * 1.5], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slideUp = interpolate(frame, [0, fps * 0.3], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeIn * fadeOut,
      }}
    >
      <div
        style={{
          transform: `translateY(${slideUp}px)`,
          padding: "14px 36px",
          background: `${accentColor}dd`,
          borderRadius: 12,
          color: "#FFFFFF",
          fontSize: 32,
          fontFamily: "'Montserrat', 'Inter', sans-serif",
          fontWeight: 800,
          textTransform: "uppercase" as const,
          letterSpacing: 2,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {title}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 프로그레스 바 (Tier 1 #5: 8px)
// ---------------------------------------------------------------------------

const ProgressBar: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = interpolate(frame, [0, durationInFrames], [0, 100]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: "rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${accentColor}, ${HIGHLIGHT_BG})`,
          borderRadius: 4,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// 브랜드 워터마크 (Tier 1 #6: 좌상단/우하단)
// ---------------------------------------------------------------------------

const BrandWatermark: React.FC<{ accentColor: string }> = ({
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const isPortrait = height > 1000;

  const opacity = interpolate(frame, [0, fps * 0.8], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        ...(isPortrait
          ? { top: 60, left: 40 }
          : { bottom: 30, right: 40 }),
        opacity,
      }}
    >
      <span
        style={{
          color: accentColor,
          fontSize: 20,
          fontFamily: "'Montserrat', 'Inter', sans-serif",
          fontWeight: 800,
          letterSpacing: 4,
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        VIBEHUB
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 타이틀 카드 (Tier 1 #8: 1.5초)
// ---------------------------------------------------------------------------

const TitleCard: React.FC<{
  title: string;
  accentColor: string;
  brandColor: string;
}> = ({ title, accentColor, brandColor }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const isPortrait = height > 1000;

  if (frame > fps * 2.5) return null;

  const scaleIn = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.8 },
  });

  const fadeOut = interpolate(frame, [fps * 1.5, fps * 2.5], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // frame 0 근처: 불투명 배경 (YouTube 썸네일용)
  // → YouTube가 첫 프레임에서 썸네일을 추출하므로 꽉 찬 디자인 필요
  const bgOpacity = interpolate(frame, [0, fps * 0.5], [0.95, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: fadeOut,
        background: `linear-gradient(180deg, ${brandColor}${Math.round(bgOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 100%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: isPortrait ? "120px 40px" : "60px 80px",
      }}
    >
      <div
        style={{
          transform: `scale(${scaleIn})`,
          textAlign: "center",
          maxWidth: isPortrait ? "90%" : "70%",
        }}
      >
        {/* VIBEHUB 브랜드 */}
        <div
          style={{
            fontSize: isPortrait ? 28 : 22,
            fontFamily: "'Montserrat', 'Inter', sans-serif",
            fontWeight: 800,
            letterSpacing: 8,
            color: accentColor,
            marginBottom: 20,
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}
        >
          VIBEHUB
        </div>

        {/* 액센트 라인 */}
        <div
          style={{
            width: 80,
            height: 4,
            background: `linear-gradient(90deg, ${accentColor}, ${HIGHLIGHT_BG})`,
            borderRadius: 2,
            margin: "0 auto 24px",
          }}
        />

        {/* 제목 — 크고 굵게 */}
        <h1
          style={{
            color: "#FFFFFF",
            fontSize: isPortrait ? 54 : 44,
            fontFamily: "'Montserrat', 'Inter', sans-serif",
            fontWeight: 900,
            lineHeight: 1.15,
            margin: 0,
            textTransform: "uppercase" as const,
            WebkitTextStroke: "1.5px rgba(0,0,0,0.4)",
            textShadow: "0 4px 24px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          {title}
        </h1>

        {/* 하단 태그라인 */}
        <div
          style={{
            marginTop: 28,
            fontSize: isPortrait ? 18 : 16,
            fontFamily: "'Montserrat', 'Inter', sans-serif",
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 3,
            textTransform: "uppercase" as const,
          }}
        >
          TECH BRIEFING
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// CTA 엔딩 (Tier 1 #9: 2초)
// ---------------------------------------------------------------------------

const CTA_DURATION_SEC = 2.5;

const CtaEnding: React.FC<{
  ctaText: string;
  accentColor: string;
  /** 실제 콘텐츠 끝 프레임 (props 기반) */
  contentEndFrame?: number;
}> = ({ ctaText, accentColor, contentEndFrame }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height } = useVideoConfig();
  const isPortrait = height > 1000;

  // props에 실제 duration이 있으면 그걸 사용, 아니면 Composition 기본값
  const actualEnd = contentEndFrame ?? durationInFrames;
  const ctaStart = actualEnd - fps * CTA_DURATION_SEC;
  if (frame < ctaStart) return null;

  const localFrame = frame - ctaStart;

  const buttonScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 10, mass: 0.6, stiffness: 150 },
  });

  const t = localFrame / fps;
  const pulse = 1 + Math.sin(t * 5) * 0.025;

  return (
    <div
      style={{
        position: "absolute",
        bottom: isPortrait ? 350 : 120,
        left: 40,
        right: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-block",
          transform: `scale(${buttonScale * pulse})`,
        }}
      >
        <div
          style={{
            padding: "18px 40px",
            background: `linear-gradient(135deg, ${accentColor}, ${HIGHLIGHT_BG})`,
            borderRadius: 14,
            color: "#000000",
            fontSize: isPortrait ? 34 : 28,
            fontFamily: "'Montserrat', 'Inter', sans-serif",
            fontWeight: 900,
            textTransform: "uppercase" as const,
            boxShadow: `0 8px 32px ${accentColor}66`,
          }}
        >
          {ctaText}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 메인 Composition
// ---------------------------------------------------------------------------

export const BriefShort: React.FC<BriefShortProps> = ({
  scenes,
  words,
  title,
  brandColor = BRAND_COLOR,
  accentColor = ACCENT,
  ctaText = "Síguenos en VibeHub",
  durationInFrames: propDuration,
}) => {
  const { height } = useVideoConfig();
  // 실제 콘텐츠 끝 = props duration 또는 마지막 word의 endFrame + 여유
  const contentEndFrame = propDuration ?? (words.length > 0 ? words[words.length - 1]!.endFrame + 60 : undefined);
  const isPortrait = height > 1000;

  return (
    <AbsoluteFill style={{ backgroundColor: brandColor }}>
      {/* L1: 씬 배경 + TransitionSeries 크로스페이드 */}
      <SceneTransitionLayer scenes={scenes} brandColor={brandColor} />

      {/* L2: 롱폼 챕터 카드 (씬에 chapterTitle이 있으면 표시) */}
      {!isPortrait &&
        scenes
          .filter((s) => s.chapterTitle)
          .map((scene, i) => (
            <Sequence
              key={`ch-${i}`}
              from={scene.startFrame}
              durationInFrames={45}
            >
              <ChapterCard title={scene.chapterTitle!} accentColor={accentColor} />
            </Sequence>
          ))}

      {/* L3: 프로그레스 바 */}
      <ProgressBar accentColor={accentColor} />

      {/* L4: 브랜드 워터마크 */}
      <BrandWatermark accentColor={accentColor} />

      {/* L5: 타이틀 카드 (첫 2.5초, YouTube 썸네일 겸용) */}
      <TitleCard title={title} accentColor={accentColor} brandColor={brandColor} />

      {/* L6: 워드바이워드 자막 */}
      <WordByWordCaptions words={words} />

      {/* L7: CTA 엔딩 (마지막 2.5초) */}
      <CtaEnding ctaText={ctaText} accentColor={accentColor} contentEndFrame={contentEndFrame} />
    </AbsoluteFill>
  );
};
