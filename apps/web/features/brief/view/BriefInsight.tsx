interface BriefInsightProps {
  text: string;
}

export function BriefInsight({ text }: BriefInsightProps) {
  return <p className="brief-insight">{text}</p>;
}
