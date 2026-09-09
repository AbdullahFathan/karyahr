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
  const hasRecipient =
    typeof record.recipientUserId === "string" || typeof record.recipientEmail === "string";
  return (
    typeof record.type === "string" &&
    (NOTIFICATION_JOB_TYPES as readonly string[]).includes(record.type) &&
    hasRecipient &&
    typeof record.title === "string" &&
    typeof record.body === "string" &&
    typeof record.entityType === "string" &&
    typeof record.entityId === "string"
  );
}

/**
 * Persists an in-app notification when a user is targeted and sends email.
 */
export async function processNotificationJob(job: Job): Promise<void> {
  if (!isNotificationEvent(job.data)) {
    throw new Error(`Invalid notification payload for job ${job.id ?? "unknown"}`);
  }

  const prisma = getPrisma();
  const notifications = new PrismaNotificationRepository(prisma);
  const users = new PrismaUserRepository(prisma);

  let notificationId: string | null = null;
  let emailTo = job.data.recipientEmail ?? null;

  if (job.data.recipientUserId) {
    const created = await notifications.create({
      recipientUserId: job.data.recipientUserId,
      type: job.data.type,
      title: job.data.title,
      body: job.data.body,
      entityType: job.data.entityType,
      entityId: job.data.entityId,
    });
    notificationId = created.id;
    const user = await users.findById(job.data.recipientUserId);
    emailTo = emailTo ?? user?.email ?? null;
  }

  if (!emailTo) {
    if (notificationId) {
      await notifications.updateEmailStatus(notificationId, "SKIPPED");
    }
    return;
  }

  try {
    await sendMail({
      to: emailTo,
      subject: job.data.title,
      text: job.data.body,
    });
    if (notificationId) {
      await notifications.updateEmailStatus(notificationId, getMailTransporter() ? "SENT" : "SKIPPED");
    }
  } catch {
    if (notificationId) {
      await notifications.updateEmailStatus(notificationId, "FAILED");
    }
    throw new Error(`Failed to send notification email ${notificationId ?? job.id ?? "unknown"}`);
  }
}
