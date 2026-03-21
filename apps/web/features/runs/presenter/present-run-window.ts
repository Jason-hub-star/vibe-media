export function presentRunWindow(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) {
    return "In progress";
  }

  return `${startedAt.slice(11, 16)} -> ${finishedAt.slice(11, 16)}`;
}
