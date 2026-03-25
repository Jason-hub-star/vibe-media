/** Image normalization with Sharp — WebP conversion and resizing. */

import path from "path";
import sharp from "sharp";

const MAX_IMAGE_DIMENSION = 2048;
const PREVIEW_IMAGE_DIMENSION = 640;

export function shouldNormalizeImage(mimeType: string) {
  return mimeType.startsWith("image/") && mimeType !== "image/gif" && mimeType !== "image/svg+xml";
}

export function sanitizeUploadName(fileName: string) {
  const parsed = path.parse(fileName);
  const normalized = parsed.name.toLowerCase().replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return normalized || "asset";
}

export async function normalizeImageVariants(buffer: Buffer) {
  const pipeline = sharp(buffer).rotate();
  const mainBuffer = await pipeline.clone().resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const previewBuffer = await pipeline.clone().resize({ width: PREVIEW_IMAGE_DIMENSION, height: PREVIEW_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
  const metadata = await sharp(mainBuffer).metadata();
  return { mainBuffer, previewBuffer, width: metadata.width, height: metadata.height };
}
