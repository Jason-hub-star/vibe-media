"use server";

interface SubmitResult {
  ok: boolean;
  status?: "subscribed" | "already" | "error";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

async function notifyTelegram(email: string, locale: string, audienceId: string, apiKey: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;
    if (!botToken || !chatId) return;

    // Fetch audience to get total count
    let totalCount = 0;
    try {
      const res = await fetch(`https://api.resend.com/audiences/${audienceId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        totalCount = typeof data.contacts_count === "number" ? data.contacts_count : 0;
      }
    } catch {
      // Non-critical
    }

    const text = `📬 새 구독자: ${maskEmail(email)} (${locale.toUpperCase()} 총 ${totalCount}명)`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // Fire-and-forget — never fail the subscription response
  }
}

export async function submitNewsletter(
  email: string,
  locale: string = "en",
): Promise<SubmitResult> {
  if (!email || !email.includes("@") || email.length < 5 || email.length > 320) {
    return { ok: false, status: "error" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[submit-newsletter] RESEND_API_KEY not set");
    return { ok: false, status: "error" };
  }

  const audienceId =
    locale === "es"
      ? process.env.RESEND_AUDIENCE_ES
      : process.env.RESEND_AUDIENCE_EN;

  if (!audienceId) {
    console.error(`[submit-newsletter] RESEND_AUDIENCE_${locale.toUpperCase()} not set`);
    return { ok: false, status: "error" };
  }

  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );

    if (res.ok) {
      // Fire-and-forget Telegram notification
      notifyTelegram(email, locale, audienceId, apiKey).catch(() => {});
      return { ok: true, status: "subscribed" };
    }

    if (res.status === 409) {
      return { ok: true, status: "already" };
    }

    const errBody = await res.text();
    console.error(`[submit-newsletter] Resend API error: ${res.status} ${errBody}`);
    return { ok: false, status: "error" };
  } catch (err) {
    console.error("[submit-newsletter] Network error:", err);
    return { ok: false, status: "error" };
  }
}
