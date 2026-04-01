"use client";

import Image from "next/image";
import { useState } from "react";

import { formatDateShort } from "@/lib/format-date";

interface ToolSubmissionPreviewProps {
  title: string;
  summary: string;
  websiteUrl: string;
  tags: string;
  ogImage: string | null;
  submitterName: string;
}

export function ToolSubmissionPreview({
  title,
  summary,
  websiteUrl,
  tags,
  ogImage,
  submitterName,
}: ToolSubmissionPreviewProps) {
  const [imgError, setImgError] = useState(false);

  const displayTitle = title.trim() || "Your tool name";
  const displaySummary = summary.trim() || "One-line summary will appear here...";
  const displayName = submitterName.trim() || "Community builder";
  const today = formatDateShort(new Date().toISOString());

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const showImage = ogImage && !imgError;

  return (
    <article className="panel stack-tight submission-card">
      {showImage && (
        <div className="discover-card-cover">
          <Image
            src={ogImage}
            alt={displayTitle}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            loading="lazy"
            unoptimized
            className="discover-card-cover-img"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      <div className="row-between submission-card-header">
        <div className="stack-tight">
          <p className="eyebrow">Live preview</p>
          <h3 className={!title.trim() ? "muted" : ""}>{displayTitle}</h3>
        </div>
        <span className="status status-preview">preview</span>
      </div>

      <p className={`muted${!summary.trim() ? "" : ""}`}>{displaySummary}</p>

      {tagList.length > 0 && (
        <div className="tag-row">
          {tagList.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {websiteUrl.trim() && (
        <div className="button-row">
          <a
            className="button-primary"
            href={websiteUrl}
            rel="noreferrer"
            target="_blank"
          >
            Visit website
          </a>
        </div>
      )}

      <p className="submission-meta muted">
        Submitted by {displayName} on {today}
      </p>
    </article>
  );
}
