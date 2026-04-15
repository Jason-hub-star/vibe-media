const ADSENSE_PUBLISHER_ID =
  process.env.ADSENSE_PUBLISHER_ID ?? process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

function normalizePublisherId(value: string | undefined): string | null {
  if (!value) return null;
  return value.replace(/^ca-pub-/, "").trim() || null;
}

export async function GET() {
  const publisherId = normalizePublisherId(ADSENSE_PUBLISHER_ID);
  const body = publisherId
    ? `google.com, pub-${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# AdSense publisher id is not configured yet.\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
