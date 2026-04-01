import Image from "next/image";

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

  return (
    <div
      className="discover-card-cover"
      style={{ "--card-accent-rgb": accentRgb } as React.CSSProperties}
    >
      {coverImage ? (
        <Image
          src={coverImage}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="lazy"
          className="discover-card-cover-img"
        />
      ) : (
        <div className="discover-card-cover-fallback">
          <span className="discover-card-cover-icon">{cat.icon}</span>
        </div>
      )}
    </div>
  );
}
