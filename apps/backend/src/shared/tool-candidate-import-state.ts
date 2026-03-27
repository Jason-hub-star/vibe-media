import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ImportedToolCandidateDraft, ScreenedImportedToolCandidate } from "./tool-candidate-import-screening";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateDir = path.resolve(__dirname, "../../state");

export const toolCandidateFetchStatePath = path.join(
  stateDir,
  "tool-candidate-fetch.json",
);
export const toolCandidateScreenedStatePath = path.join(
  stateDir,
  "tool-candidate-screened.json",
);

export interface ToolCandidateFetchState {
  performedAt: string;
  candidates: ImportedToolCandidateDraft[];
  sourceStatuses: Array<{
    sourceId: string;
    sourceName: string;
    status: "fetched" | "failed" | "skipped";
    itemCount: number;
    note: string | null;
  }>;
}

export interface ToolCandidateScreenedState {
  performedAt: string;
  candidates: ScreenedImportedToolCandidate[];
  sourceStatuses: ToolCandidateFetchState["sourceStatuses"];
  errors: Array<{
    sourceId: string;
    title: string;
    message: string;
  }>;
}

function ensureStateDir() {
  mkdirSync(stateDir, { recursive: true });
}

export function writeToolCandidateFetchState(state: ToolCandidateFetchState) {
  ensureStateDir();
  writeFileSync(toolCandidateFetchStatePath, JSON.stringify(state, null, 2));
}

export function readToolCandidateFetchState() {
  try {
    return JSON.parse(readFileSync(toolCandidateFetchStatePath, "utf8")) as ToolCandidateFetchState;
  } catch {
    return null;
  }
}

export function writeToolCandidateScreenedState(state: ToolCandidateScreenedState) {
  ensureStateDir();
  writeFileSync(toolCandidateScreenedStatePath, JSON.stringify(state, null, 2));
}

export function readToolCandidateScreenedState() {
  try {
    return JSON.parse(readFileSync(toolCandidateScreenedStatePath, "utf8")) as ToolCandidateScreenedState;
  } catch {
    return null;
  }
}
