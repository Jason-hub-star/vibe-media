import { ImageResponse } from "next/og";

import { getBriefDetail } from "@/features/brief/use-case/get-brief-detail";

export const runtime = "edge";
export const alt = "VibeHub Brief";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#151110";
const CREAM = "#f4eee2";
const ORANGE = "#f08a24";

export default async function OgImage({
  params
}: {
  params: Promise<{ slug: string }>;
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
        {/* Top: eyebrow + topic */}
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
            VibeHub
          </div>
          <div style={{ fontSize: "22px", opacity: 0.6 }}>{topic}</div>
        </div>

        {/* Middle: title + summary */}
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

        {/* Bottom: domain */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ fontSize: "20px", opacity: 0.4 }}>vibehub.tech</div>
          <div style={{ fontSize: "20px", opacity: 0.4 }}>
            Daily AI Briefs
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
