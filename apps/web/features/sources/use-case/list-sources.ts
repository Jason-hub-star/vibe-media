import { listSources as listSourcesApi } from "../api/list-sources";

export function listSources() {
  return listSourcesApi();
}
