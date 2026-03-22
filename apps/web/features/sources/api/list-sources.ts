import { listSources as listSourcesBackend } from "@vibehub/backend";

export async function listSources() {
  return listSourcesBackend();
}
