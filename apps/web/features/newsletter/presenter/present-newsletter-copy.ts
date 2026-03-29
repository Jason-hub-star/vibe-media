export type NewsletterState = "idle" | "loading" | "success" | "already" | "error";

export function presentNewsletterCopy(state: NewsletterState) {
  if (state === "loading") return "Subscribing...";
  if (state === "success") return "Subscription request saved.";
  if (state === "already") return "You're already subscribed!";
  if (state === "error") return "Enter a valid email to continue.";
  return "Get one polished AI brief digest when it matters.";
}
