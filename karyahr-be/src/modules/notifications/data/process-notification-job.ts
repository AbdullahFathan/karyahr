import type { Job } from "bullmq";
import { sendMail } from "../../../shared/mail/send-mail";
import { getMailTransporter } from "../../../config/email";
import { getPrisma } from "../../../shared/database/prisma";
import { PrismaUserRepository } from "../../auth/data/PrismaUserRepository";
import type { NotificationEvent } from "../domain/entities/Notification";
import { NOTIFICATION_JOB_TYPES } from "../domain/entities/Notification";
import { PrismaNotificationRepository } from "./PrismaNotificationRepository";

function isNotificationEvent(data: unknown): data is NotificationEvent {
  if (!data || typeof data !== "object") {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    typeof record.type === "string" &&
    (NOTIFICATION_JOB_TYPES as readonly string[]).includes(record.type) &&
    typeof record.recipientUserId === "string" &&
    typeof record.title === "string" &&
    typeof record.body === "string" &&
    typeof record.entityType === "string" &&
    typeof record.entityId === "string"
  );
}

/**
 * Persists an in-app notification and sends email (or skips when SMTP is unset).
 */
export async function processNotificationJob(job: Job): Promise<void> {
  if (!isNotificationEvent(job.data)) {
    throw new Error(`Invalid notification payload for job ${job.id ?? "unknown"}`);
  }

  const prisma = getPrisma();
  const notifications = new PrismaNotificationRepository(prisma);
  const users = new PrismaUserRepository(prisma);
  const created = await notifications.create(job.data);
  const user = await users.findById(job.data.recipientUserId);

  if (!user?.email) {
    await notifications.updateEmailStatus(created.id, "SKIPPED");
    return;
  }

  try {
    await sendMail({
      to: user.email,
      subject: job.data.title,
      text: job.data.body,
    });
    await notifications.updateEmailStatus(created.id, getMailTransporter() ? "SENT" : "SKIPPED");
  } catch {
    await notifications.updateEmailStatus(created.id, "FAILED");
    throw new Error(`Failed to send notification email ${created.id}`);
  }
}
