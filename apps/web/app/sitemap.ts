import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";

/** hreflang alternates for a given path */
function localeAlternates(path: string): MetadataRoute.Sitemap[number]["alternates"] {
  return {
    languages: Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [briefs, discoverItems] = await Promise.all([
    listBriefs(),
    listDiscoverItems()
  ]);

  const staticPaths = [
    { path: "", freq: "daily" as const, priority: 1 },
    { path: "/brief", freq: "daily" as const, priority: 0.9 },
    { path: "/radar", freq: "daily" as const, priority: 0.8 },
    { path: "/sources", freq: "weekly" as const, priority: 0.6 },
    { path: "/about", freq: "monthly" as const, priority: 0.5 },
    { path: "/newsletter", freq: "monthly" as const, priority: 0.5 },
    { path: "/privacy", freq: "yearly" as const, priority: 0.3 },
    { path: "/terms", freq: "yearly" as const, priority: 0.3 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Static pages × locales
  for (const page of staticPaths) {
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${page.path}`,
        changeFrequency: page.freq,
        priority: page.priority,
        alternates: localeAlternates(page.path),
      });
    }
  }

  // Brief pages × locales
  for (const brief of briefs) {
    const path = `/brief/${brief.slug}`;
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        ...(brief.publishedAt ? { lastModified: new Date(brief.publishedAt) } : {}),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: localeAlternates(path),
      });
    }
  }

  // Discover pages × locales
  for (const item of discoverItems) {
    const path = `/radar/${item.id}`;
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        ...(item.publishedAt ? { lastModified: new Date(item.publishedAt) } : {}),
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: localeAlternates(path),
      });
    }
  }

  return entries;
}
