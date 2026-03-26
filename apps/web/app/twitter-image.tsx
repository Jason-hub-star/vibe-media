import { ImageResponse } from "next/og";

import { colorTokens, brandTokens } from "@vibehub/design-tokens";

export const runtime = "edge";
export const alt = `${brandTokens.name} — ${brandTokens.briefTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = colorTokens.ink;
const CREAM = colorTokens.cream;
const ORANGE = colorTokens.orange;

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "24px",
          background: INK,
          color: CREAM,
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              background: ORANGE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 700,
              color: INK
            }}
          >
            VH
          </div>
          <div style={{ fontSize: "56px", fontWeight: 700 }}>{brandTokens.name}</div>
        </div>
        <div style={{ fontSize: "28px", opacity: 0.6 }}>
          Daily AI news briefs, curated from 30+ global sources
        </div>
      </div>
    ),
    { ...size }
  );
}
