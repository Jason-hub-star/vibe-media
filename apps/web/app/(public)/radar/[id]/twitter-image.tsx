import { ImageResponse } from "next/og";

import { getDiscoverItemDetail } from "@/features/discover/use-case/get-discover-item-detail";
import { presentDiscoverCategory } from "@/features/discover/presenter/present-discover-category";
import { colorTokens, brandTokens, categoryAccentHex } from "@vibehub/design-tokens";

export const runtime = "edge";
export const alt = `${brandTokens.name} Radar`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = colorTokens.ink;
const CREAM = colorTokens.cream;

export default async function TwitterImage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getDiscoverItemDetail(id);

  const title = item?.title ?? "Item not found";
  const cat = item ? presentDiscoverCategory(item.category) : null;
  const accent = cat ? (categoryAccentHex[cat.color] ?? colorTokens.orange) : colorTokens.orange;
  const categoryLabel = cat ? `${cat.icon} ${cat.label}` : "Radar";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 64px",
          background: INK,
          color: CREAM,
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              background: accent,
              color: INK,
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "22px",
              fontWeight: 700
            }}
          >
            {brandTokens.name}
          </div>
          <div style={{ fontSize: "22px", opacity: 0.6 }}>{categoryLabel}</div>
        </div>
        <div
          style={{
            fontSize: title.length > 60 ? "40px" : "48px",
            fontWeight: 700,
            lineHeight: 1.2
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: "20px", opacity: 0.4 }}>{brandTokens.domain}</div>
      </div>
    ),
    { ...size }
  );
}
