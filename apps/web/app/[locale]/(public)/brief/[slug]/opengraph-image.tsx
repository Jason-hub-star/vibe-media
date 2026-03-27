import { ImageResponse } from "next/og";

import { getBriefDetail } from "@/features/brief/use-case/get-brief-detail";
import { colorTokens, brandTokens } from "@vibehub/design-tokens";

export const runtime = "edge";
export const alt = `${brandTokens.name} Brief`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = colorTokens.ink;
const CREAM = colorTokens.cream;
const ORANGE = colorTokens.orange;

export default async function OgImage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const brief = await getBriefDetail(slug);

  const title = brief?.title ?? "Brief not found";
  const summary = brief?.summary ?? "";
  const topic = brief?.topic ?? "AI Brief";
  const truncatedSummary =
    summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;

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
              background: ORANGE,
              color: INK,
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "22px",
              fontWeight: 700
            }}
          >
            {brandTokens.name}
          </div>
          <div style={{ fontSize: "22px", opacity: 0.6 }}>{topic}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: title.length > 60 ? "40px" : "48px",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em"
            }}
          >
            {title}
          </div>
          {truncatedSummary && (
            <div style={{ fontSize: "22px", opacity: 0.6, lineHeight: 1.5 }}>
              {truncatedSummary}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ fontSize: "20px", opacity: 0.4 }}>{brandTokens.domain}</div>
          <div style={{ fontSize: "20px", opacity: 0.4 }}>
            {brandTokens.briefTagline}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
