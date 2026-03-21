import { submitNewsletter as submitNewsletterApi } from "../api/submit-newsletter";

export async function submitNewsletter(email: string) {
  return submitNewsletterApi(email);
}
