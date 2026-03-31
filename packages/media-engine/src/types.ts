/** media-engine 공통 타입 — 생성, 이미지, TTS, 배포 인터페이스 전부 포함. */

// --- Generation ---
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface GenerationResultSection {
  headline: string;
  body: string;
  imageSlot: string;
  styleKey: string;
}

export interface GenerationResult {
  sections: GenerationResultSection[];
}

// --- Image Provider ---
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

// --- TTS ---
export interface TtsRequest {
  text: string;
  voice?: string;
  speed?: number;
  language?: string;
}

export interface TtsResult {
  audioBuffer: Buffer;
  durationMs: number;
  format: "mp3" | "wav";
}

export interface TtsProvider {
  name: string;
  synthesize(req: TtsRequest): Promise<TtsResult>;
}

// --- Publish ---
export interface PublishPayload {
  title: string;
  /** brief slug (크로스프로모 링크 생성용) */
  slug?: string;
  htmlBody?: string;
  markdownBody?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  scheduledAt?: Date;
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  error?: string;
}

export interface PublishTarget {
  name: string;
  publish(payload: PublishPayload): Promise<PublishResult>;
}
