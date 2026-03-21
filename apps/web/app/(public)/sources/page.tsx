import { PageFrame } from "@/components/PageFrame";
import { EmptyState } from "@/components/EmptyState";
import { SectionBlock } from "@/components/SectionBlock";
import { listSources } from "@/features/sources/use-case/list-sources";
import { SourceRow } from "@/features/sources/view/SourceRow";

export default function SourcesPage() {
  const sources = listSources();

  return (
    <PageFrame>
      <SectionBlock eyebrow="Trust layer" title="Tracked source feeds for the brief pipeline">
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
