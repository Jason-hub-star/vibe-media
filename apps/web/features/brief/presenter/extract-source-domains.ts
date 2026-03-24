/**
 * Extract unique domain names from source links.
 */
export function extractSourceDomains(
  sourceLinks: Array<{ href: string }>
): string[] {
  const domains = new Set<string>();
  for (const link of sourceLinks) {
    try {
      domains.add(new URL(link.href).hostname.replace(/^www\./, ""));
    } catch {
      // skip malformed URLs
    }
  }
  return [...domains];
}
