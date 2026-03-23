export interface ModificationReasonEntry {
  type: "confidence" | "policy" | "missing_field" | "render_required" | "duplicate";
  description: string;
  severity: "warning" | "error";
}

const TYPE_LABELS: Record<ModificationReasonEntry["type"], string> = {
  confidence: "신뢰도 미달",
  policy: "정책 위반",
  missing_field: "필수 항목 누락",
  render_required: "렌더링 필요",
  duplicate: "중복 의심",
};

const SEVERITY_ICON: Record<ModificationReasonEntry["severity"], string> = {
  warning: "\u26A0",
  error: "\u274C",
};

export function ModificationReason({
  reasons,
}: {
  reasons: ModificationReasonEntry[];
}) {
  if (reasons.length === 0) return null;

  return (
    <div className="modification-reasons">
      <p className="eyebrow">수정이 필요한 이유</p>
      <ul className="modification-reason-list">
        {reasons.map((r, i) => (
          <li
            className={`modification-reason modification-reason-${r.severity}`}
            key={i}
          >
            <span className="modification-reason-icon">
              {SEVERITY_ICON[r.severity]}
            </span>
            <span className="modification-reason-type">
              {TYPE_LABELS[r.type]}
            </span>
            <span className="modification-reason-desc">{r.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
