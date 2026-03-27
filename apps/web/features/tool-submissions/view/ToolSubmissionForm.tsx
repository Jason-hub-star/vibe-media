"use client";

import { useActionState } from "react";

import { submitToolSubmissionAction } from "../action/submit-tool-submission";

export function ToolSubmissionForm() {
  const [state, formAction, isPending] = useActionState(submitToolSubmissionAction, {
    status: "idle",
    message: null,
  });

  return (
    <form action={formAction} className="panel stack-tight submission-form">
      <div className="stack-tight">
        <p className="eyebrow">Submit your tool</p>
        <h3>Share your best tool without creating an account.</h3>
        <p className="muted">
          We run lightweight screening first, then operators handpick the strongest tools into Showcase Picks.
        </p>
      </div>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="submission-honeypot"
        name="company"
        tabIndex={-1}
        type="text"
      />

      <label className="stack-tight">
        <span className="eyebrow">Tool title</span>
        <input className="input" name="title" placeholder="Vibe Ops Console" required />
      </label>

      <label className="stack-tight">
        <span className="eyebrow">One-line summary</span>
        <textarea
          className="input textarea-input"
          name="summary"
          placeholder="What does it do, and why should people care?"
          required
        />
      </label>

      <label className="stack-tight">
        <span className="eyebrow">Website URL</span>
        <input className="input" name="websiteUrl" placeholder="https://example.com" required type="url" />
      </label>

      <div className="submission-grid">
        <label className="stack-tight">
          <span className="eyebrow">GitHub URL</span>
          <input className="input" name="githubUrl" placeholder="https://github.com/..." type="url" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Demo URL</span>
          <input className="input" name="demoUrl" placeholder="https://example.com/demo" type="url" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Docs URL</span>
          <input className="input" name="docsUrl" placeholder="https://example.com/docs" type="url" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Tags</span>
          <input className="input" name="tags" placeholder="automation, agents, workflow" />
        </label>
      </div>

      <label className="stack-tight">
        <span className="eyebrow">Description</span>
        <textarea
          className="input textarea-input"
          name="description"
          placeholder="Tell us what makes this tool useful."
        />
      </label>

      <div className="submission-grid">
        <label className="stack-tight">
          <span className="eyebrow">Your email</span>
          <input className="input" name="submitterEmail" placeholder="you@example.com" required type="email" />
        </label>
        <label className="stack-tight">
          <span className="eyebrow">Your name</span>
          <input className="input" name="submitterName" placeholder="Builder name" />
        </label>
      </div>

      <div className="button-row">
        <button className="button-primary" disabled={isPending} type="submit">
          {isPending ? "Submitting…" : "Submit tool"}
        </button>
        <a className="button-secondary" href="#latest-submissions">
          View latest submissions
        </a>
      </div>

      <p className={state.status === "error" ? "action-error" : "muted"}>
        {state.message ??
          "Required: title, summary, website, and email. We screen new submissions automatically before listing them."}
      </p>
    </form>
  );
}
