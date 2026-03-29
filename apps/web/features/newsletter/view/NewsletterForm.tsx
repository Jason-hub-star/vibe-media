"use client";

import { useState } from "react";

import { presentNewsletterCopy, type NewsletterState } from "../presenter/present-newsletter-copy";
import { submitNewsletter } from "../use-case/submit-newsletter";

interface NewsletterFormProps {
  locale?: string;
}

export function NewsletterForm({ locale = "en" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<NewsletterState>("idle");

  return (
    <form
      className="newsletter-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setState("loading");
        const result = await submitNewsletter(email, locale);
        if (result.status === "already") {
          setState("already");
        } else {
          setState(result.ok ? "success" : "error");
        }
      }}
    >
      <label className="stack-tight">
        <span className="eyebrow">Email</span>
        <input
          aria-label="Email"
          className="input"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </label>
      <button className="button-primary" disabled={state === "loading"} type="submit">
        {state === "loading" ? "Subscribing..." : "Join newsletter"}
      </button>
      <p className="newsletter-proof">
        Be among the first to get daily AI briefs delivered free.
      </p>
      <p className="muted">{presentNewsletterCopy(state)}</p>
    </form>
  );
}
