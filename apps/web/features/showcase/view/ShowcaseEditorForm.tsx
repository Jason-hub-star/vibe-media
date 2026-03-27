"use client";

import { useActionState } from "react";

import type { DiscoverItem, ShowcaseEntry } from "@vibehub/content-contracts";

import { saveShowcaseEntryAction } from "../action/save-showcase-entry";

function toDateTimeInputValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toBodyValue(value: string[]) {
  return value.join("\n");
}

function toLinksValue(entry: ShowcaseEntry) {
  return entry.links.map((link) => `${link.label}|${link.href}|${link.kind}`).join("\n");
}

export function ShowcaseEditorForm({
  discoverItems,
  entry,
  title
}: {
  discoverItems: DiscoverItem[];
  entry?: ShowcaseEntry;
  title: string;
}) {
  const [state, formAction, isPending] = useActionState(saveShowcaseEntryAction, {
    status: "idle",
    message: null
  });

  return (
    <form action={formAction} className="panel stack-tight showcase-editor">
      <div className="row-between">
        <div className="stack-tight">
          <p className="eyebrow">{entry ? "Existing entry" : "New entry"}</p>
          <h3>{title}</h3>
        </div>
        {state.message ? (
          <p className={state.status === "error" ? "action-error" : "muted"}>{state.message}</p>
        ) : null}
      </div>

      <input name="id" type="hidden" defaultValue={entry?.id ?? ""} />
      <input name="timezoneOffsetMinutes" type="hidden" value={String(new Date().getTimezoneOffset())} />

      <div className="admin-form-grid">
        <label className="stack-tight">
          <span className="eyebrow">Title</span>
          <input className="input" defaultValue={entry?.title ?? ""} name="title" required />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Slug</span>
          <input className="input" defaultValue={entry?.slug ?? ""} name="slug" placeholder="auto from title" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Author label</span>
          <input className="input" defaultValue={entry?.authorLabel ?? ""} name="authorLabel" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Cover asset</span>
          <input
            className="input"
            defaultValue={entry?.coverAsset ?? "/placeholders/source-strip-placeholder.svg"}
            name="coverAsset"
          />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Origin</span>
          <select className="input" defaultValue={entry?.origin ?? "editorial"} name="origin">
            <option value="editorial">editorial</option>
            <option value="imported">imported</option>
            <option value="user_submission">user_submission</option>
          </select>
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Review status</span>
          <select className="input" defaultValue={entry?.reviewStatus ?? "draft"} name="reviewStatus">
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="changes_requested">changes_requested</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Display order</span>
          <input className="input" defaultValue={String(entry?.displayOrder ?? 0)} name="displayOrder" type="number" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Discover reference</span>
          <select className="input" defaultValue={entry?.sourceDiscoverItemId ?? ""} name="sourceDiscoverItemId">
            <option value="">No reference</option>
            {discoverItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="stack-tight">
        <span className="eyebrow">Summary</span>
        <textarea className="input textarea-input" defaultValue={entry?.summary ?? ""} name="summary" required />
      </label>

      <label className="stack-tight">
        <span className="eyebrow">Body paragraphs</span>
        <textarea
          className="input textarea-input"
          defaultValue={entry ? toBodyValue(entry.body) : ""}
          name="body"
          placeholder="One paragraph per line"
        />
      </label>

      <div className="admin-form-grid">
        <label className="stack-tight">
          <span className="eyebrow">Primary link label</span>
          <input className="input" defaultValue={entry?.primaryLink.label ?? ""} name="primaryLinkLabel" required />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Primary link href</span>
          <input className="input" defaultValue={entry?.primaryLink.href ?? ""} name="primaryLinkHref" required />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Primary link kind</span>
          <select className="input" defaultValue={entry?.primaryLink.kind ?? "primary"} name="primaryLinkKind">
            <option value="primary">primary</option>
            <option value="demo">demo</option>
            <option value="github">github</option>
            <option value="docs">docs</option>
            <option value="video">video</option>
            <option value="brief">brief</option>
          </select>
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Tags</span>
          <input className="input" defaultValue={entry?.tags.join(", ") ?? ""} name="tags" />
        </label>
      </div>

      <label className="stack-tight">
        <span className="eyebrow">Additional links</span>
        <textarea
          className="input textarea-input"
          defaultValue={entry ? toLinksValue(entry) : ""}
          name="links"
          placeholder={"Label|https://example.com|docs"}
        />
      </label>

      <div className="admin-form-grid">
        <label className="stack-tight">
          <span className="eyebrow">Created by</span>
          <input className="input" defaultValue={entry?.createdBy ?? "operator"} name="createdBy" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Submitted by</span>
          <input className="input" defaultValue={entry?.submittedBy ?? ""} name="submittedBy" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Scheduled at</span>
          <input
            className="input"
            defaultValue={toDateTimeInputValue(entry?.scheduledAt ?? null)}
            name="scheduledAt"
            type="datetime-local"
          />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Published at</span>
          <input
            className="input"
            defaultValue={toDateTimeInputValue(entry?.publishedAt ?? null)}
            name="publishedAt"
            type="datetime-local"
          />
        </label>
      </div>

      <div className="button-row">
        <label className="showcase-toggle">
          <input defaultChecked={entry?.featuredHome ?? false} name="featuredHome" type="checkbox" />
          <span>Feature on home</span>
        </label>
        <label className="showcase-toggle">
          <input defaultChecked={entry?.featuredRadar ?? false} name="featuredRadar" type="checkbox" />
          <span>Feature on Radar</span>
        </label>
        <label className="showcase-toggle">
          <input defaultChecked={entry?.featuredSubmitHub ?? false} name="featuredSubmitHub" type="checkbox" />
          <span>Feature on Submit hub</span>
        </label>
      </div>

      <div className="button-row">
        <button className="button-primary" disabled={isPending} type="submit">
          {isPending ? "Saving…" : entry ? "Save entry" : "Create entry"}
        </button>
      </div>
    </form>
  );
}
