import Link from "next/link";
import { notFound } from "next/navigation";

import { PageFrame } from "@/components/PageFrame";
import { SectionBlock } from "@/components/SectionBlock";
import { getBriefDetail } from "@/features/brief/use-case/get-brief-detail";

export default async function BriefDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brief = await getBriefDetail(slug);

  if (!brief) {
    notFound();
  }

  return (
    <PageFrame>
      <SectionBlock eyebrow={brief.publishedAt?.slice(0, 10) ?? "Brief"} title={brief.title}>
        <article className="panel stack-tight">
          <p className="muted">{brief.summary}</p>
          {brief.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
        <article className="panel stack-tight">
          <p className="eyebrow">Sources</p>
          {brief.sourceLinks.map((source) => (
            <Link className="inline-link" href={source.href} key={source.href}>
              {source.label}
            </Link>
          ))}
        </article>
      </SectionBlock>
    </PageFrame>
  );
}
