"use client";

import Image from "next/image";
import { useState } from "react";

import type { DiscoverCategory } from "@vibehub/content-contracts";
import { colorRgbTokens } from "@vibehub/design-tokens";

import { presentDiscoverCategory } from "../presenter/present-discover-category";

interface DiscoverCardCoverProps {
  coverImage?: string;
  title: string;
  category: DiscoverCategory;
}

export function DiscoverCardCover({ coverImage, title, category }: DiscoverCardCoverProps) {
  const cat = presentDiscoverCategory(category);
  const accentRgb = colorRgbTokens[cat.color];
  const [imgError, setImgError] = useState(false);

  const showImage = coverImage && !imgError;

  return (
    <div
      className="discover-card-cover"
      style={{ "--card-accent-rgb": accentRgb } as React.CSSProperties}
    >
      {showImage ? (
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="lazy"
          unoptimized
          className="discover-card-cover-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="discover-card-cover-fallback" />
      )}
    </div>
  );
}
