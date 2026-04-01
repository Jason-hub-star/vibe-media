"use client";

import { useCallback, useRef, useState } from "react";

import { ToolSubmissionForm } from "./ToolSubmissionForm";
import { ToolSubmissionPreview } from "./ToolSubmissionPreview";
import { useOgPrefill } from "./use-og-prefill";

interface FormValues {
  title: string;
  summary: string;
  websiteUrl: string;
  tags: string;
  submitterName: string;
}

const INITIAL: FormValues = {
  title: "",
  summary: "",
  websiteUrl: "",
  tags: "",
  submitterName: "",
};

export function ToolSubmissionFormWithPreview() {
  const [values, setValues] = useState<FormValues>(INITIAL);
  const titleRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  const syncFromRefs = useCallback(() => {
    setValues((prev) => ({
      ...prev,
      title: titleRef.current?.value ?? prev.title,
      summary: summaryRef.current?.value ?? prev.summary,
    }));
  }, []);

  const { isCrawling, ogImage, handleUrlBlur } = useOgPrefill({
    titleRef,
    summaryRef,
    onFieldChange: syncFromRefs,
  });

  const handleFieldChange = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="hero-grid submit-tool-grid">
      <ToolSubmissionForm
        titleRef={titleRef}
        summaryRef={summaryRef}
        isCrawling={isCrawling}
        onFieldChange={handleFieldChange}
        onUrlBlur={handleUrlBlur}
      />
      <div className="submission-preview">
        <p className="eyebrow">Live preview</p>
        <ToolSubmissionPreview
          title={values.title}
          summary={values.summary}
          websiteUrl={values.websiteUrl}
          tags={values.tags}
          ogImage={ogImage}
          submitterName={values.submitterName}
        />
      </div>
    </div>
  );
}
