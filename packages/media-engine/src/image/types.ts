/** Provider abstraction layer for image generation services. */

export interface TextToImageRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: "1K" | "2K" | "4K";
  imageInput?: string[];
}

export interface TextToImageResult {
  imageUrls: string[];
}

export interface RemoveBgRequest {
  imageUrl: string;
}

export interface RemoveBgResult {
  imageUrls: string[];
}

export interface ImageGenerationProvider {
  name: string;
  textToImage(req: TextToImageRequest): Promise<TextToImageResult>;
  removeBackground(req: RemoveBgRequest): Promise<RemoveBgResult>;
  healthCheck(): Promise<boolean>;
}
