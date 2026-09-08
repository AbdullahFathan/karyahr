import { env } from "../../config/env";
import { getMailTransporter } from "../../config/email";
import { logger } from "../utils/logger";

export type SendMailInput = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
};

/**
 * Sends email via SMTP, or logs and returns when SMTP is not configured (local noop).
 */
export async function sendMail(input: SendMailInput): Promise<void> {
  const transporter = getMailTransporter();
  if (!transporter) {
    logger.info({ to: input.to, subject: input.subject }, "SMTP not configured; mail skipped");
    return;
  }

  await transporter.sendMail({
    from: env().SMTP_FROM ?? "noreply@karyahr.local",
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
