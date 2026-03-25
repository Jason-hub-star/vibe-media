/** Image download utility — URL or data URI to base64. */

export async function downloadImageAsBase64(
  url: string,
): Promise<{ imageBytes: string; mimeType: string }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], imageBytes: match[2] };
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  return {
    imageBytes: buffer.toString("base64"),
    mimeType: contentType,
  };
}
