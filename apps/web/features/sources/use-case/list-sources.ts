import { listSources as listSourcesApi } from "../api/list-sources";

export async function listSources() {
  return listSourcesApi();
}
