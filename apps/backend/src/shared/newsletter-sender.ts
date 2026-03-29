/**
 * Sends daily newsletter broadcasts via Resend API.
 */
import { Resend } from "resend";

import { buildNewsletterHtml, buildNewsletterSubject } from "./newsletter-template.js";

interface NewsletterBrief {
  title: string;
  summary: string;
  slug: string;
}

interface SendNewsletterInput {
  briefs: NewsletterBrief[];
  locale: string;
  dryRun?: boolean;
}

interface SendNewsletterResult {
  locale: string;
  broadcastId?: string;
  sent: boolean;
  reason?: string;
}

export async function sendDailyNewsletter(input: SendNewsletterInput): Promise<SendNewsletterResult> {
  const { briefs, locale, dryRun = false } = input;

  if (briefs.length === 0) {
    return { locale, sent: false, reason: "no briefs" };
  }

  const audienceId =
    locale === "es"
      ? process.env.RESEND_AUDIENCE_ES
      : process.env.RESEND_AUDIENCE_EN;

  if (!audienceId) {
    return { locale, sent: false, reason: `RESEND_AUDIENCE_${locale.toUpperCase()} not set` };
  }

  const subject = buildNewsletterSubject(briefs, locale);
  const html = buildNewsletterHtml(briefs, locale);

  if (dryRun) {
    console.log(`[newsletter-sender] DRY RUN (${locale}): subject="${subject}", ${briefs.length} briefs, ${html.length} bytes HTML`);
    return { locale, sent: false, reason: "dry-run" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { locale, sent: false, reason: "RESEND_API_KEY not set" };
  }

  const resend = new Resend(apiKey);

  // Step 1: Create broadcast
  const createRes = await resend.broadcasts.create({
    audienceId,
    from: process.env.NEWSLETTER_FROM ?? "VibeHub <daily@vibehub.tech>",
    subject,
    html,
  });

  if (createRes.error || !createRes.data) {
    const msg = createRes.error?.message ?? "Unknown error creating broadcast";
    console.error(`[newsletter-sender] Failed to create broadcast (${locale}):`, msg);
    return { locale, sent: false, reason: msg };
  }

  const broadcastId = createRes.data.id;

  // Step 2: Send broadcast
  const sendRes = await resend.broadcasts.send(broadcastId);

  if (sendRes.error) {
    const msg = sendRes.error.message ?? "Unknown error sending broadcast";
    console.error(`[newsletter-sender] Failed to send broadcast (${locale}):`, msg);
    return { locale, sent: false, broadcastId, reason: msg };
  }

  console.log(`[newsletter-sender] Broadcast sent (${locale}): id=${broadcastId}, subject="${subject}"`);
  return { locale, sent: true, broadcastId };
}
