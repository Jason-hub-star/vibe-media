import { ImageResponse } from "next/og";

import { colorTokens } from "@vibehub/design-tokens";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colorTokens.orange,
          borderRadius: "6px",
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: "-1px",
          color: colorTokens.ink
        }}
      >
        VH
      </div>
    ),
    { ...size }
  );
}
