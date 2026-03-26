import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { BriefCard } from "@/features/brief/view/BriefCard";
import { getRelatedBriefs } from "@/features/brief/use-case/get-related-briefs";
import { getDiscoverItemDetail } from "@/features/discover/use-case/get-discover-item-detail";
import { presentDiscoverCategory } from "@/features/discover/presenter/present-discover-category";
import { presentDiscoverStatus } from "@/features/discover/presenter/present-discover-status";
import { SITE_URL } from "@/lib/constants";

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getDiscoverItemDetail(id);
  if (!item) return { title: "Item not found" };

  const canonical = `${SITE_URL}/radar/${id}`;
  return {
    title: item.title,
    description: item.summary,
    openGraph: {
      type: "article",
      title: item.title,
      description: item.summary,
      url: canonical,
      ...(item.publishedAt ? { publishedTime: item.publishedAt } : {})
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.summary
    },
    alternates: { canonical }
  };
}

export default async function RadarDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, relatedBriefs] = await Promise.all([
    getDiscoverItemDetail(id),
    getRelatedBriefs(id)
  ]);

  if (!item) {
    notFound();
  }

  const cat = presentDiscoverCategory(item.category);
  const { label: statusLabel, style: statusStyle } = presentDiscoverStatus(item.status);
  const canonical = `${SITE_URL}/radar/${id}`;

  return (
    <PageFrame>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Thing",
          name: item.title,
          description: item.summary,
          url: canonical,
          ...(item.publishedAt ? { datePublished: item.publishedAt } : {})
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: SITE_URL
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Radar",
              item: `${SITE_URL}/radar`
            },
            {
              "@type": "ListItem",
              position: 3,
              name: item.title,
              item: canonical
            }
          ]
        }}
      />
      <SectionBlock eyebrow={cat.label} title={item.title}>
        <div className="radar-detail-col">
          <div className="row-between">
            <span className={`category-pill category-pill-${cat.color}`}>
              <span className="category-pill-icon">{cat.icon}</span>
              {cat.label}
            </span>
            <span className={`status status-${statusStyle}`}>{statusLabel}</span>
          </div>

          <p className="brief-dek">{item.summary}</p>

          {item.fullDescription && item.fullDescription !== item.summary && (
            <article className="stack-tight">
              <p>{item.fullDescription}</p>
            </article>
          )}

          {item.tags.length > 0 && (
            <div className="tag-row">
              {item.tags.map((tag) => (
                <span className="tag-chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.actions.length > 0 && (
            <div className="button-row">
              {item.actions.map((action) => (
                <Link
                  className="button-secondary"
                  href={action.href}
                  key={`${item.id}-${action.kind}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </SectionBlock>

      {relatedBriefs.length > 0 && (
        <SectionBlock eyebrow="Related" title="Related Briefs">
          <div className="brief-grid">
            {relatedBriefs.map((brief) => (
              <BriefCard brief={brief} key={brief.slug} />
            ))}
          </div>
        </SectionBlock>
      )}
    </PageFrame>
  );
}
