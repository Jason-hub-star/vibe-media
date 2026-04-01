import { NextResponse } from "next/server";

import { fetchOgMetadata } from "@/features/tool-submissions/api/fetch-og-metadata";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { ogTitle: null, ogDescription: null, ogImage: null },
        { status: 400 },
      );
    }

    // Validate URL scheme
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json(
        { ogTitle: null, ogDescription: null, ogImage: null },
        { status: 400 },
      );
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { ogTitle: null, ogDescription: null, ogImage: null },
        { status: 400 },
      );
    }

    const metadata = await fetchOgMetadata(url);
    return NextResponse.json(metadata);
  } catch {
    // Graceful degradation: return empty metadata instead of 500
    return NextResponse.json({
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
    });
  }
}
