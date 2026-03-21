export function presentNewsletterCopy(state: "idle" | "success" | "error") {
  if (state === "success") return "Subscription request saved.";
  if (state === "error") return "Enter a valid email to continue.";
  return "Get one polished AI brief digest when it matters.";
}
