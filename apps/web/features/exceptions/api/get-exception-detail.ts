import { getExceptionDetail as getExceptionDetailBackend } from "@vibehub/backend";

export async function getExceptionDetail(id: string) {
  return getExceptionDetailBackend(id);
}
