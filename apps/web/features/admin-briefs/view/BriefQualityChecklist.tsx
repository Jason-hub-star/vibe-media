import type { BriefDetail } from "@vibehub/content-contracts";

import {
  evaluateBriefQuality,
  type QualityStatus,
} from "../presenter/evaluate-brief-quality";

const STATUS_ICON: Record<QualityStatus, string> = {
  pass: "\u2713",
  warn: "\u26A0",
  fail: "\u2717",
};

export function BriefQualityChecklist({ brief }: { brief: BriefDetail }) {
  const checks = evaluateBriefQuality(brief);
  const passCount = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="panel stack-tight">
      <p className="eyebrow">
        Quality check — {passCount}/{checks.length} passed
      </p>
      <div className="quality-checklist">
        {checks.map((check) => (
          <div
            className={`quality-row quality-${check.status}`}
            key={check.criterion}
          >
            <span className="quality-icon">{STATUS_ICON[check.status]}</span>
            <span className="quality-criterion">{check.criterion}</span>
            <span className="quality-message">{check.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
