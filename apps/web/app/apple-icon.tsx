import { ImageResponse } from "next/og";

import { colorTokens } from "@vibehub/design-tokens";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colorTokens.ink,
          borderRadius: "36px",
          fontSize: "108px",
          fontWeight: 700,
          fontFamily: "sans-serif",
          color: colorTokens.orange
        }}
      >
        V
      </div>
    ),
    { ...size }
  );
}
