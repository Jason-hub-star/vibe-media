/** Domain-agnostic types shared across media-engine modules. */

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface GenerationResultSection {
  headline: string;
  body: string;
  imageSlot: string;
  styleKey: string;
}

export interface GenerationResult {
  sections: GenerationResultSection[];
}
