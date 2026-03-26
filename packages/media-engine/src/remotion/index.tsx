/**
 * Remotion 진입점 — registerRoot + Composition 등록.
 */

import { registerRoot, Composition } from "remotion";
import type { AnyZodObject } from "remotion";
import React from "react";
import { BriefAudiogram } from "./BriefAudiogram";
import type { BriefAudiogramProps } from "./BriefAudiogram";

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
          brandColor: "#0A0A0A",
          accentColor: "#F97316",
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
