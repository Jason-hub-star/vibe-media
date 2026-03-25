/** Kie.ai provider — wraps kie-client + removebg-client. */

import { generateImageWithKie } from "./kie-client";
import { removeBackground as kieRemoveBackground } from "./removebg-client";
import type { ImageGenerationProvider, TextToImageRequest, TextToImageResult, RemoveBgRequest, RemoveBgResult } from "./types";

const KIE_HEALTH_URL = "https://api.kie.ai/api/v1/jobs";

export class KieProvider implements ImageGenerationProvider {
  name = "kie";
  async textToImage(req: TextToImageRequest): Promise<TextToImageResult> {
    const result = await generateImageWithKie(req.prompt, { aspectRatio: req.aspectRatio, resolution: req.resolution, imageInput: req.imageInput });
    return { imageUrls: result.imageUrls };
  }
  async removeBackground(req: RemoveBgRequest): Promise<RemoveBgResult> {
    const result = await kieRemoveBackground(req.imageUrl);
    return { imageUrls: result.imageUrls };
  }
  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = process.env.KIE_API_KEY;
      if (!apiKey) return false;
      const res = await fetch(KIE_HEALTH_URL, { method: "HEAD", headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(5000) });
      return res.ok || res.status === 405;
    } catch { return false; }
  }
}
