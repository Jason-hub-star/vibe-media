import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";
import { listBriefs } from "@/features/brief/use-case/list-briefs";
import { listDiscoverItems } from "@/features/discover/use-case/list-discover-items";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [briefs, discoverItems] = await Promise.all([
    listBriefs(),
    listDiscoverItems()
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/brief`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/radar`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/sources`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/newsletter`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 }
  ];

  const briefPages: MetadataRoute.Sitemap = briefs.map((brief) => ({
    url: `${SITE_URL}/brief/${brief.slug}`,
    ...(brief.publishedAt ? { lastModified: new Date(brief.publishedAt) } : {}),
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  const discoverPages: MetadataRoute.Sitemap = discoverItems.map((item) => ({
    url: `${SITE_URL}/radar/${item.id}`,
    ...(item.publishedAt ? { lastModified: new Date(item.publishedAt) } : {}),
    changeFrequency: "weekly" as const,
    priority: 0.6
  }));

  return [...staticPages, ...briefPages, ...discoverPages];
}
