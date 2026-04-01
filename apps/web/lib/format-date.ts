/** ISO date string → "2026-04-01" display format */
export function formatDateShort(iso: string): string {
  return iso.slice(0, 10);
}
