import { extractSourceDomains } from "../presenter/extract-source-domains";

interface BriefSourcePanelProps {
  sourceLinks: Array<{ label: string; href: string }>;
}

export function BriefSourcePanel({ sourceLinks }: BriefSourcePanelProps) {
  if (sourceLinks.length === 0) return null;

  const domains = extractSourceDomains(sourceLinks);

  return (
    <div className="brief-source-panel panel stack-tight">
      <p className="eyebrow">Sources</p>
      {domains.length > 0 && (
        <div className="tag-row">
          {domains.map((domain) => (
            <span className="source-chip" key={domain}>{domain}</span>
          ))}
        </div>
      )}
      <div className="brief-source-list">
        {sourceLinks.map((source) => (
          <a
            className="brief-source-link"
            href={source.href}
            key={source.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {source.label}
          </a>
        ))}
      </div>
    </div>
  );
}
