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

// ─── Template helpers ───────────────────────────────────────────────

export const BASE = `
<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
  <h2 style="color:#1a1a2e;margin-bottom:20px;">{title}</h2>
  <p>{body}</p>
  <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;" />
  <p style="color:#6b7280;font-size:12px;">Questing — Find work. Earn XP. Level up.</p>
</div>
`;

export function emailApplicationSubmitted({ workerName, jobTitle, posterName }: {
  workerName: string; jobTitle: string; posterName: string;
}) {
  return {
    subject: `New application for "${jobTitle}"`,
    html: BASE.replace("{title}", "New Application").replace("{body}",
      `Hi ${posterName},\n\n${workerName} has applied for your job "${jobTitle}".\n\nYou can review the application and accept or reject it from your dashboard.`
    ),
  };
}

export function emailApplicationAccepted({ workerName, jobTitle, posterName }: {
  workerName: string; jobTitle: string; posterName: string;
}) {
  return {
    subject: `Your application for "${jobTitle}" was accepted!`,
    html: BASE.replace("{title}", "Application Accepted").replace("{body}",
      `Hi ${workerName},\n\nGreat news! ${posterName} has accepted your application for "${jobTitle}".\n\nYour quest is now in progress. Head to the job page to get started.`
    ),
  };
}

export function emailApplicationRejected({ workerName, jobTitle, posterName }: {
  workerName: string; jobTitle: string; posterName: string;
}) {
  return {
    subject: `Application for "${jobTitle}" — not accepted this time`,
    html: BASE.replace("{title}", "Application Not Accepted").replace("{body}",
      `Hi ${workerName},\n\nThank you for applying to "${jobTitle}" by ${posterName}. This time the job was filled with another applicant, but keep questing — more jobs are always open.`
    ),
  };
}

export function emailJobCompleted({ workerName, jobTitle, payRate, payUnit }: {
  workerName: string; jobTitle: string; payRate: number; payUnit: string;
}) {
  return {
    subject: `Quest completed! "${jobTitle}"`,
    html: BASE.replace("{title}", "Quest Completed!").replace("{body}",
      `Hi ${workerName},\n\nCongratulations! You've completed "${jobTitle}".\n\nReward: ${payRate} ${payUnit}\n\nXP awarded: 100 (QUEST_COMPLETED)\n\nIf payment was held via Stripe, you'll receive it shortly. Check your dashboard for the status.`
    ),
  };
}

export function emailPaymentReleased({ workerName, jobTitle, amount }: {
  workerName: string; jobTitle: string; amount: number;
}) {
  return {
    subject: `Payment released for "${jobTitle}"`,
    html: BASE.replace("{title}", "Payment Released").replace("{body}",
      `Hi ${workerName},\n\nPayment for "${jobTitle}" has been released.\n\nAmount: $${(amount / 100).toFixed(2)}\n\nThe funds have been transferred to your Stripe account. Check your dashboard for details.`
    ),
  };
}

export function emailPaymentRefunded({ workerName, jobTitle, amount }: {
  workerName: string; jobTitle: string; amount: number;
}) {
  return {
    subject: `Payment refunded for "${jobTitle}"`,
    html: BASE.replace("{title}", "Payment Refunded").replace("{body}",
      `Hi ${workerName},\n\nPayment for "${jobTitle}" has been refunded.\n\nAmount: $${(amount / 100).toFixed(2)}\n\nThe funds have been returned to your Stripe account.`
    ),
  };
}

export function emailDisputeOpened({ raiserName, jobTitle, recipientName }: {
  raiserName: string; jobTitle: string; recipientName: string;
}) {
  return {
    subject: `Dispute opened on "${jobTitle}"`,
    html: BASE.replace("{title}", "Dispute Opened").replace("{body}",
      `Hi ${recipientName},\n\n${raiserName} has opened a dispute on job "${jobTitle}".\n\nThe job status is now DISPUTED. Please check the dispute details and respond promptly. Admin will review and mediate.`
    ),
  };
}

export function emailIncidentReported({ reporterName, jobTitle, severity, recipientName }: {
  reporterName: string; jobTitle: string; severity: string; recipientName: string;
}) {
  return {
    subject: `Safety incident reported on "${jobTitle}" (${severity})`,
    html: BASE.replace("{title}", "Safety Incident Reported").replace("{body}",
      `Hi ${recipientName},\n\n${reporterName} has reported a safety incident on job "${jobTitle}".\n\nSeverity: ${severity}\n\nPlease review the incident details and take appropriate action.`
    ),
  };
}

export function emailNewChatMessage({ senderName, jobTitle, recipientName }: {
  senderName: string; jobTitle: string; recipientName: string;
}) {
  return {
    subject: `New message on "${jobTitle}"`,
    html: BASE.replace("{title}", "New Message").replace("{body}",
      `Hi ${recipientName},\n\n${senderName} sent a message on the chat thread for "${jobTitle}".\n\nCheck the job page to read the message and respond.`
    ),
  };
}

export function emailDisputeResolved({ raiserName, jobTitle, recipientName, outcome }: {
  raiserName: string; jobTitle: string; recipientName: string; outcome: string;
}) {
  return {
    subject: `Dispute resolved on "${jobTitle}"`,
    html: BASE.replace("{title}", "Dispute Resolved").replace("{body}",
      `Hi ${recipientName},\n\nThe dispute on "${jobTitle}" raised by ${raiserName} has been resolved.\n\nOutcome: ${outcome}\n\nThe job status has been updated accordingly. Check your dashboard for details.`
    ),
  };
}
