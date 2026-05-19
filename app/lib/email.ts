import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// If RESEND_API_KEY is not set, sendEmail is a no-op (safe for dev)
const FROM_ADDRESS = process.env.RESEND_FROM || "noreply@questing.app";

export type EmailRecipient = { email: string; name?: string };

export type EmailOptions = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email via Resend. Silently skips if RESEND_API_KEY is not configured.
 */
export async function sendEmail(opts: EmailOptions): Promise<{ id?: string; error?: string }> {
  if (!resend) {
    console.warn("[email] Resend not configured — email skipped:", opts.subject);
    return { error: "Resend not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(opts.to) ? opts.to.map(r => r.email) : opts.to.email,
      cc: Array.isArray(opts.to) && opts.to.length > 1
        ? opts.to.filter(r => r.email !== (Array.isArray(opts.to) ? opts.to[0].email : opts.to.email)).map(r => r.email)
        : undefined,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || stripHtml(opts.html),
    });
    return { id: result.data?.id };
  } catch (err) {
    console.error("[email] Send failed:", opts.subject, err);
    return { error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Minimal HTML-to-text stripper for text fallback.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
