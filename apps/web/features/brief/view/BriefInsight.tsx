interface BriefInsightProps {
  text: string;
}

export function BriefInsight({ text }: BriefInsightProps) {
  return (
    <div className="brief-insight">
      <span className="brief-insight-label">Why it matters</span>
      <p>{text}</p>
    </div>
  );
}
