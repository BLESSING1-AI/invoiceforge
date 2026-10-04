/**
 * Email provider abstraction.
 * Resend is the first implementation. Swap providers without changing call sites.
 *
 * Required env for Resend:
 *   RESEND_API_KEY=re_...
 *   EMAIL_FROM="InvoiceForge <onboarding@resend.dev>"  (or verified domain)
 */

import { Business, Job } from "./types";
import { generateInvoicePdf } from "./pdf";

export interface SendInvoiceEmailParams {
  to: string;
  business: Business;
  job: Job;
  optionalMessage?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  configured: boolean;
}

export interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<SendEmailResult>;
}

function formatRand(amount: number): string {
  return (
    "R " +
    amount.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlBody(
  business: Business,
  job: Job,
  optionalMessage?: string
): string {
  const inv = job.invoiceNumber || "DRAFT";
  const total = formatRand(job.total);
  const due = job.dueDate
    ? new Date(job.dueDate).toLocaleDateString("en-ZA")
    : "On receipt";
  const custom = optionalMessage
    ? `<p style="margin:16px 0;color:#334155;">${escapeHtml(optionalMessage)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
    <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${escapeHtml(business.name)}</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Invoice ${escapeHtml(inv)}</p>
    <p style="margin:0 0 8px;color:#334155;">Hi ${escapeHtml(job.customer.name || "there")},</p>
    <p style="margin:0 0 16px;color:#334155;">
      Please find attached invoice <strong>${escapeHtml(inv)}</strong>
      for <strong>${total}</strong>.
    </p>
    ${custom}
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      <tr><td style="padding:8px 0;color:#64748b;">Invoice number</td><td style="padding:8px 0;text-align:right;font-weight:600;">${escapeHtml(inv)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Amount due</td><td style="padding:8px 0;text-align:right;font-weight:600;">${total}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Due date</td><td style="padding:8px 0;text-align:right;font-weight:600;">${due}</td></tr>
    </table>
    <p style="margin:24px 0 0;color:#64748b;font-size:13px;">
      The invoice PDF is attached to this email.
    </p>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      Sent via InvoiceForge on behalf of ${escapeHtml(business.name)}.
    </p>
  </div>
</body>
</html>`;
}

/** Resend implementation (fetch-based, no SDK required). */
class ResendProvider implements EmailProvider {
  name = "resend";

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        configured: false,
        error: "RESEND_API_KEY is not set",
      };
    }

    const from =
      process.env.EMAIL_FROM || "InvoiceForge <onboarding@resend.dev>";
    const inv = params.job.invoiceNumber || "DRAFT";
    const subject = `Invoice #${inv} from ${params.business.name}`;
    const html = buildHtmlBody(
      params.business,
      params.job,
      params.optionalMessage
    );

    const pdfBytes = generateInvoicePdf(params.business, params.job);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject,
          html,
          attachments: [
            {
              filename: `invoice-${inv}.pdf`,
              content: pdfBase64,
            },
          ],
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          provider: this.name,
          configured: true,
          error:
            (data as { message?: string }).message ||
            `Resend error ${res.status}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        configured: true,
        messageId: (data as { id?: string }).id,
      };
    } catch (e) {
      return {
        success: false,
        provider: this.name,
        configured: true,
        error: e instanceof Error ? e.message : "Network error",
      };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  return new ResendProvider();
}

export function isEmailConfigured(): boolean {
  return getEmailProvider().isConfigured();
}
