import { presentReadTime } from "@/features/shared/presenter/present-read-time";

interface BriefMetaBarProps {
  topic?: string;
  readTimeMinutes?: number;
  sourceCount: number;
}

export function BriefMetaBar({ topic, readTimeMinutes, sourceCount }: BriefMetaBarProps) {
  return (
    <div className="brief-meta-bar">
      {topic && <span className="brief-meta-chip source-chip">{topic}</span>}
      {readTimeMinutes != null && (
        <span className="brief-meta-chip">{presentReadTime(readTimeMinutes)}</span>
      )}
      <span className="brief-meta-chip">{sourceCount} sources</span>
    </div>
  );
}
