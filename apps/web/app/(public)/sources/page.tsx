import type { Metadata } from "next";

import { SITE_URL } from "@/lib/constants";
import { PageFrame } from "@/components/PageFrame";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "Source Registry",
  description:
    "30+ verified sources powering VibeHub's AI brief pipeline.",
  alternates: { canonical: `${SITE_URL}/sources` }
};
import { SectionBlock } from "@/components/SectionBlock";
import { listSources } from "@/features/sources/use-case/list-sources";
import { SourceRow } from "@/features/sources/view/SourceRow";

export default async function SourcesPage() {
  const sources = await listSources();

  return (
    <PageFrame>
      <SectionBlock eyebrow="Sources" title="Official feeds and channels we use to write briefs">
        {sources.length === 0 ? (
          <EmptyState
            body="Tracked feeds and release channels will appear here after source registration."
            title="No sources tracked"
          />
        ) : (
          <ul className="panel stack-tight">
            {sources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </ul>
        )}
      </SectionBlock>
    </PageFrame>
  );
}
