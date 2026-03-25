/** Publish target abstraction — Tistory, YouTube, Newsletter adapters implement this. */

export interface PublishPayload {
  title: string;
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
