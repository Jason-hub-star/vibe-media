/** Runtime directory helpers for deployment-specific storage paths. */
import path from "path";

const PUBLIC_UPLOAD_PREFIX = "/uploads";

function resolveRuntimePath(inputPath: string) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

export function getUploadsRootDir() {
  return resolveRuntimePath(process.env.UPLOADS_DIR || "uploads");
}

export function getUploadsFilePath(...segments: string[]) {
  return path.join(getUploadsRootDir(), ...segments);
}

export function getProjectUploadsDir(projectId: string, ...segments: string[]) {
  return getUploadsFilePath(projectId, ...segments);
}

export function getPublicUploadsPrefix() {
  return PUBLIC_UPLOAD_PREFIX;
}

export function fromPublicUploadPath(publicPath: string) {
  if (publicPath === PUBLIC_UPLOAD_PREFIX) return [];
  if (!publicPath.startsWith(`${PUBLIC_UPLOAD_PREFIX}/`)) return null;
  const relativePath = publicPath.slice(PUBLIC_UPLOAD_PREFIX.length).replace(/^\/+/, "");
  return relativePath ? relativePath.split("/") : [];
}
