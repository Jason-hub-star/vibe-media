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
        <p className="eyebrow">Fast intake</p>
        <h3>Add your project in under a minute.</h3>
        <p className="muted">
          Start with four basics: tool name, one-line summary, website, and your email. Everything else is optional.
        </p>
        <div className="submission-pill-row" aria-label="Submission highlights">
          <span className="submission-pill">4 required fields</span>
          <span className="submission-pill">No account needed</span>
          <span className="submission-pill">Optional links welcome</span>
        </div>
      </div>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="submission-honeypot"
        name="company"
        tabIndex={-1}
        type="text"
      />

      <section className="stack-tight submission-section" aria-labelledby="submission-basics-heading">
        <div className="stack-tight">
          <p className="eyebrow" id="submission-basics-heading">
            Start with the basics
          </p>
          <p className="muted">These four fields are enough for screening and listing review.</p>
        </div>

        <div className="submission-grid">
          <label className="stack-tight submission-field">
            <span className="submission-field-topline">
              <span className="eyebrow">Tool title</span>
              <span className="submission-badge">Required</span>
            </span>
            <span className="submission-help">Use the name people already know.</span>
            <input
              autoComplete="organization-title"
              className="input"
              name="title"
              placeholder="Vibe Ops Console"
              required
            />
          </label>

          <label className="stack-tight submission-field">
            <span className="submission-field-topline">
              <span className="eyebrow">Website URL</span>
              <span className="submission-badge">Required</span>
            </span>
            <span className="submission-help">Link the main page where people can understand or try it.</span>
            <input
              autoComplete="url"
              className="input"
              name="websiteUrl"
              placeholder="https://yourproject.com"
              required
              type="url"
            />
          </label>

          <label className="stack-tight submission-field submission-field--full">
            <span className="submission-field-topline">
              <span className="eyebrow">One-line summary</span>
              <span className="submission-badge">Required</span>
            </span>
            <span className="submission-help">Say what it does and why it matters in one or two short sentences.</span>
            <textarea
              className="input textarea-input"
              name="summary"
              placeholder="AI ops dashboard that watches workflows, catches failures, and helps teams recover faster."
              required
            />
          </label>

          <label className="stack-tight submission-field">
            <span className="submission-field-topline">
              <span className="eyebrow">Your email</span>
              <span className="submission-badge">Required</span>
            </span>
            <span className="submission-help">We only use this if we need to follow up about the submission.</span>
            <input
              autoComplete="email"
              className="input"
              name="submitterEmail"
              placeholder="founder@yourproject.com"
              required
              type="email"
            />
          </label>
        </div>
      </section>

      <div className="button-row">
        <button className="button-primary" disabled={isPending} type="submit">
          {isPending ? "Submitting..." : "Submit with basics only"}
        </button>
        <a className="button-secondary" href="#latest-submissions">
          See approved examples
        </a>
      </div>

      <details className="submission-optional">
        <summary>Add optional links, tags, and more context</summary>
        <div className="stack-tight submission-optional-body">
          <p className="muted">
            Extra detail is welcome, but not required. Add these only if they are ready.
          </p>

          <div className="submission-grid">
            <label className="stack-tight submission-field">
              <span className="submission-field-topline">
                <span className="eyebrow">GitHub URL</span>
                <span className="submission-badge submission-badge-optional">Optional</span>
              </span>
              <span className="submission-help">Best for open-source or transparent build logs.</span>
              <input className="input" name="githubUrl" placeholder="https://github.com/your-org/project" type="url" />
            </label>
            <label className="stack-tight submission-field">
              <span className="submission-field-topline">
                <span className="eyebrow">Demo URL</span>
                <span className="submission-badge submission-badge-optional">Optional</span>
              </span>
              <span className="submission-help">A live walkthrough, sandbox, or launch video helps.</span>
              <input className="input" name="demoUrl" placeholder="https://yourproject.com/demo" type="url" />
            </label>
            <label className="stack-tight submission-field">
              <span className="submission-field-topline">
                <span className="eyebrow">Docs URL</span>
                <span className="submission-badge submission-badge-optional">Optional</span>
              </span>
              <span className="submission-help">Link setup docs if users need more depth.</span>
              <input className="input" name="docsUrl" placeholder="https://docs.yourproject.com" type="url" />
            </label>
            <label className="stack-tight submission-field">
              <span className="submission-field-topline">
                <span className="eyebrow">Tags</span>
                <span className="submission-badge submission-badge-optional">Optional</span>
              </span>
              <span className="submission-help">A few simple tags help people discover the right category.</span>
              <input className="input" name="tags" placeholder="automation, agents, workflow" />
            </label>
          </div>

          <label className="stack-tight submission-field submission-field--full">
            <span className="submission-field-topline">
              <span className="eyebrow">Description</span>
              <span className="submission-badge submission-badge-optional">Optional</span>
            </span>
            <span className="submission-help">Share the problem, ideal user, and any standout workflow.</span>
            <textarea
              className="input textarea-input"
              name="description"
              placeholder="Built for operators who manage many automations at once and need a cleaner way to catch failures, replay runs, and track ownership."
            />
          </label>

          <label className="stack-tight submission-field">
            <span className="submission-field-topline">
              <span className="eyebrow">Your name</span>
              <span className="submission-badge submission-badge-optional">Optional</span>
            </span>
            <span className="submission-help">Add a builder, team, or company name if you want it attached.</span>
            <input autoComplete="name" className="input" name="submitterName" placeholder="Builder name" />
          </label>
        </div>
      </details>

      <p className={state.status === "error" ? "action-error" : "muted"}>
        {state.message ??
          "Only four fields are required. We check duplicates, spam signals, and site reachability before a tool appears in Latest Submissions."}
      </p>
    </form>
  );
}
