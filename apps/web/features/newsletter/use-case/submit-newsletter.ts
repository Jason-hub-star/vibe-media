import { submitNewsletter as submitNewsletterApi } from "../api/submit-newsletter";

export async function submitNewsletter(email: string, locale: string = "en") {
  return submitNewsletterApi(email, locale);
}
