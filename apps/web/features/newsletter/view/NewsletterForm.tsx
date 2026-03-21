"use client";

import { useState } from "react";

import { presentNewsletterCopy } from "../presenter/present-newsletter-copy";
import { submitNewsletter } from "../use-case/submit-newsletter";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "success" | "error">("idle");

  return (
    <form
      className="newsletter-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await submitNewsletter(email);
        setState(result.ok ? "success" : "error");
      }}
    >
      <label className="stack-tight">
        <span className="eyebrow">Email</span>
        <input
          aria-label="Email"
          className="input"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="operator@vibehub.tech"
          type="email"
          value={email}
        />
      </label>
      <button className="button-primary" type="submit">
        Join newsletter
      </button>
      <p className="muted">{presentNewsletterCopy(state)}</p>
    </form>
  );
}
