export function presentExceptionConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`;
}
