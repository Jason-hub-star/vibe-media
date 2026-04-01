import Image from "next/image";

import { colorRgbTokens } from "@vibehub/design-tokens";

import { presentBriefAccentColor } from "../presenter/present-brief-topic";

interface BriefCardCoverProps {
  coverImage?: string;
  title: string;
  topic?: string;
  slug: string;
  isLead?: boolean;
}

export function BriefCardCover({ coverImage, title, topic, slug, isLead }: BriefCardCoverProps) {
  const accent = presentBriefAccentColor(topic, slug);
  const accentRgb = colorRgbTokens[accent];

  return (
    <div
      className={`brief-card-cover${isLead ? " brief-card-cover-lead" : ""}`}
      style={{ "--card-accent-rgb": accentRgb } as React.CSSProperties}
    >
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes={isLead ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
          loading={isLead ? "eager" : "lazy"}
          priority={isLead}
          unoptimized
          className="brief-card-cover-img"
        />
      ) : (
        <div className="brief-card-cover-fallback" />
      )}
    </div>
  );
}
