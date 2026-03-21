export function presentInboxConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}
