/** Supabase Storage helper with DI — inject your own SupabaseClient. */

import path from "path";

export interface BucketConfig {
  defaultBucket: string;
  artifactBucket?: string;
  thumbnailBucket?: string;
  artifactSegments?: Set<string>;
  thumbnailSegments?: Set<string>;
  artifactExtensions?: Set<string>;
}

export interface UploadStorageTarget {
  bucket: string;
  objectPath: string;
}

interface SupabaseStorageClient {
  storage: {
    from(bucket: string): {
      upload(path: string, data: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<{ error: unknown }>;
      download(path: string): Promise<{ data: Blob | null; error: unknown }>;
      remove(paths: string[]): Promise<{ error: unknown }>;
      list(prefix?: string): Promise<{ data: Array<{ name: string }> | null; error: unknown }>;
    };
  };
}

const DEFAULT_CONFIG: Required<BucketConfig> = {
  defaultBucket: "project-assets",
  artifactBucket: "artifacts",
  thumbnailBucket: "thumbnails",
  artifactSegments: new Set(["renders"]),
  thumbnailSegments: new Set(["thumbnails"]),
  artifactExtensions: new Set([".mp4", ".webm", ".mov", ".gif", ".txt", ".json"]),
};

export function createStorageHelper(
  supabase: SupabaseStorageClient,
  config?: Partial<BucketConfig>,
) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  function resolveTarget(publicPath: string): UploadStorageTarget | null {
    const segments = publicPath.replace(/^\/uploads\//, "").split("/");
    if (segments.length < 2) return null;

    const objectPath = segments.join("/");
    const ext = path.extname(publicPath).toLowerCase();
    const secondSegment = segments[1];

    if (cfg.thumbnailSegments.has(secondSegment)) {
      return { bucket: cfg.thumbnailBucket, objectPath };
    }

    if (cfg.artifactSegments.has(secondSegment) || cfg.artifactExtensions.has(ext)) {
      return { bucket: cfg.artifactBucket, objectPath };
    }

    return { bucket: cfg.defaultBucket, objectPath };
  }

  async function upload(
    publicPath: string,
    buffer: Buffer,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<UploadStorageTarget> {
    const target = resolveTarget(publicPath);
    if (!target) throw new Error(`Cannot resolve storage target: ${publicPath}`);

    const { error } = await supabase.storage
      .from(target.bucket)
      .upload(target.objectPath, buffer, {
        contentType: options?.contentType ?? "application/octet-stream",
        upsert: options?.upsert ?? true,
      });

    if (error) throw error;
    return target;
  }

  async function download(publicPath: string): Promise<Buffer | null> {
    const target = resolveTarget(publicPath);
    if (!target) return null;

    const { data, error } = await supabase.storage
      .from(target.bucket)
      .download(target.objectPath);

    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  async function remove(publicPaths: string[]): Promise<void> {
    const byBucket = new Map<string, string[]>();
    for (const p of publicPaths) {
      const target = resolveTarget(p);
      if (!target) continue;
      const list = byBucket.get(target.bucket) ?? [];
      list.push(target.objectPath);
      byBucket.set(target.bucket, list);
    }

    for (const [bucket, paths] of byBucket) {
      await supabase.storage.from(bucket).remove(paths);
    }
  }

  return { upload, download, remove, resolveTarget };
}
