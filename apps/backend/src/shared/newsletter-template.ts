/**
 * Builds inline-CSS HTML newsletter from published briefs.
 * Pure string builder — no React Email dependency.
 */

interface NewsletterBrief {
  title: string;
  summary: string;
  slug: string;
}

const SITE_URL = process.env.SITE_URL ?? "https://vibehub.tech";

const COLORS = {
  bg: "#0e0e10",
  cardBg: "#1a1a1f",
  accent: "#a855f7",    // purple
  orange: "#f97316",
  text: "#e4e4e7",
  muted: "#a1a1aa",
  border: "#27272a",
};

const COPY: Record<string, { greeting: string; readMore: string; footer: string; subject: (first: string, more: number) => string }> = {
  en: {
    greeting: "Here's your daily AI brief digest.",
    readMore: "Read more →",
    footer: "You're receiving this because you subscribed to VibeHub daily briefs.",
    subject: (first, more) => more > 0 ? `AI Brief: ${first} + ${more} more` : `AI Brief: ${first}`,
  },
  es: {
    greeting: "Aqui tienes tu resumen diario de IA.",
    readMore: "Leer mas →",
    footer: "Recibes esto porque te suscribiste a los briefs diarios de VibeHub.",
    subject: (first, more) => more > 0 ? `AI Brief: ${first} + ${more} mas` : `AI Brief: ${first}`,
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

export function buildNewsletterSubject(briefs: NewsletterBrief[], locale: string): string {
  const copy = COPY[locale] ?? COPY.en;
  const first = briefs[0]?.title ?? "Today's Briefs";
  return copy.subject(truncate(first, 50), briefs.length - 1);
}

export function buildNewsletterHtml(briefs: NewsletterBrief[], locale: string): string {
  const copy = COPY[locale] ?? COPY.en;

  const briefCards = briefs
    .map(
      (brief) => `
    <tr><td style="padding: 0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="background:${COLORS.cardBg}; border:1px solid ${COLORS.border}; border-radius:8px;">
        <tr><td style="padding:20px;">
          <h2 style="margin:0 0 8px 0; font-size:18px; color:${COLORS.text};">
            ${escapeHtml(brief.title)}
          </h2>
          <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:${COLORS.muted};">
            ${escapeHtml(truncate(brief.summary, 280))}
          </p>
          <a href="${SITE_URL}/${locale}/brief/${encodeURIComponent(brief.slug)}"
            style="display:inline-block; padding:8px 16px; background:${COLORS.accent};
              color:#fff; text-decoration:none; border-radius:6px; font-size:14px;">
            ${copy.readMore}
          </a>
        </td></tr>
      </table>
    </td></tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:${COLORS.bg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.bg};">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation">

        <!-- Header -->
        <tr><td style="padding:0 0 24px 0; text-align:center;">
          <h1 style="margin:0; font-size:24px; color:${COLORS.accent};">
            Vibe<span style="color:${COLORS.orange};">Hub</span>
          </h1>
          <p style="margin:8px 0 0 0; font-size:14px; color:${COLORS.muted};">
            ${escapeHtml(copy.greeting)}
          </p>
        </td></tr>

        <!-- Brief cards -->
        ${briefCards}

        <!-- Footer -->
        <tr><td style="padding:24px 0 0 0; border-top:1px solid ${COLORS.border}; text-align:center;">
          <p style="margin:0 0 8px 0; font-size:12px; color:${COLORS.muted};">
            ${escapeHtml(copy.footer)}
          </p>
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}"
            style="font-size:12px; color:${COLORS.muted}; text-decoration:underline;">
            Unsubscribe
          </a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
