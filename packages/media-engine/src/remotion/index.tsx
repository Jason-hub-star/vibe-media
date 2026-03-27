/**
 * Remotion 진입점 — registerRoot + Composition 등록.
 */

import { registerRoot, Composition } from "remotion";
import type { AnyZodObject } from "remotion";
import React from "react";
import { BriefAudiogram } from "./BriefAudiogram";
import type { BriefAudiogramProps } from "./BriefAudiogram";
import { BrandIntro, BrandOutro } from "./BrandIntroOutro";
import type { IntroProps, OutroProps } from "./BrandIntroOutro";

type NoSchema = AnyZodObject;

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<NoSchema, BriefAudiogramProps & Record<string, unknown>>
        id="BriefAudiogram"
        component={BriefAudiogram}
        durationInFrames={30 * 60 * 20}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          audioSrc: "",
          subtitles: [],
          title: "VibeHub Brief",
          brandColor: "#151110",
          accentColor: "#D9863A",
        }}
      />
      <Composition<NoSchema, IntroProps & Record<string, unknown>>
        id="BrandIntro"
        component={BrandIntro}
        durationInFrames={72}
        fps={24}
        width={1280}
        height={720}
        defaultProps={{
          title: "VibeHub Brief",
          subtitle: "AI-curated tech insights",
        }}
      />
      <Composition<NoSchema, OutroProps & Record<string, unknown>>
        id="BrandOutro"
        component={BrandOutro}
        durationInFrames={120}
        fps={24}
        width={1280}
        height={720}
        defaultProps={{}}
      />
    </>
  );
};

registerRoot(RemotionRoot);
