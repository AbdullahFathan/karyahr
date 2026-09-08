import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "./env";
import { logger } from "../shared/utils/logger";

let transporter: Transporter | undefined;

/**
 * Returns a Nodemailer transporter, or undefined when SMTP is not configured.
 */
export function getMailTransporter(): Transporter | undefined {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = env();
  if (!SMTP_HOST) {
    return undefined;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ?? 587,
    auth:
      SMTP_USER && SMTP_PASS
        ? { user: SMTP_USER, pass: SMTP_PASS }
        : undefined,
  });

  logger.info({ host: SMTP_HOST }, "SMTP transporter configured");
  return transporter;
}
