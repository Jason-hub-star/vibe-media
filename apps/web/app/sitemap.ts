import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/constants";
import { listBriefs } from "@/features/brief/use-case/list-briefs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const briefs = await listBriefs();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/brief`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/radar`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/sources`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/newsletter`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 }
  ];

  const briefPages: MetadataRoute.Sitemap = briefs.map((brief) => ({
    url: `${SITE_URL}/brief/${brief.slug}`,
    lastModified: brief.publishedAt ? new Date(brief.publishedAt) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  return [...staticPages, ...briefPages];
}
