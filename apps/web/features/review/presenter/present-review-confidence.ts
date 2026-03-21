export function presentReviewConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`;
}
