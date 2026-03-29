/**
 * Remotion 진입점 — registerRoot + Composition 등록.
 */

import { registerRoot, Composition } from "remotion";
import type { AnyZodObject } from "remotion";
import React from "react";
import { BriefAudiogram } from "./BriefAudiogram";
import type { BriefAudiogramProps } from "./BriefAudiogram";
import { BriefShort } from "./BriefShort";
import type { BriefShortProps } from "./BriefShort";
import { BrandOutro } from "./BrandIntroOutro";
import type { OutroProps } from "./BrandIntroOutro";

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
      <Composition<NoSchema, BriefShortProps & Record<string, unknown>>
        id="BriefShort"
        component={BriefShort}
        durationInFrames={30 * 60}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: [],
          words: [],
          title: "VibeHub Short",
          brandColor: "#151110",
          accentColor: "#D9863A",
        }}
      />
      {/* 16:9 롱폼 — BriefShort V2 컴포넌트 재사용, 해상도만 가로 */}
      <Composition<NoSchema, BriefShortProps & Record<string, unknown>>
        id="BriefLongform"
        component={BriefShort}
        durationInFrames={30 * 60 * 5}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          scenes: [],
          words: [],
          title: "VibeHub Brief",
          brandColor: "#151110",
          accentColor: "#D9863A",
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
