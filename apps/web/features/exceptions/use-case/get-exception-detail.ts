import { getExceptionDetail as getExceptionDetailApi } from "../api/get-exception-detail";

export async function getExceptionDetail(id: string) {
  return getExceptionDetailApi(id);
}
