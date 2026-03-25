/** TTS provider abstraction — implementation added later (Google TTS, OpenAI, etc.). */

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
