import { describe, expect, test } from "bun:test";
import { ForbiddenError, NotFoundError } from "../../../../shared/errors/app-error";
import type { InAppNotification } from "../entities/Notification";
import type { INotificationRepository } from "../repositories/INotificationRepository";
import { MarkNotificationReadUseCase } from "./MarkNotificationRead.usecase";

class MemoryNotifications implements INotificationRepository {
  constructor(private row: InAppNotification) {}
  async create(): Promise<InAppNotification> {
    return this.row;
  }
  async findById(id: string): Promise<InAppNotification | null> {
    return this.row.id === id ? this.row : null;
  }
  async listByRecipient(): Promise<readonly InAppNotification[]> {
    return [this.row];
  }
  async markRead(id: string, readAt: Date): Promise<InAppNotification> {
    this.row = { ...this.row, readAt };
    return this.row;
  }
  async updateEmailStatus(): Promise<void> {}
}

const sample: InAppNotification = {
  id: "n1",
  recipientUserId: "u1",
  type: "leave.submitted",
  title: "t",
  body: "b",
  entityType: "LeaveRequest",
  entityId: "lr1",
  readAt: null,
  emailStatus: "PENDING",
  createdAt: new Date("2026-09-08T00:00:00.000Z"),
};

describe("MarkNotificationReadUseCase", () => {
  test("marks unread notifications for the owner", async () => {
    const result = await new MarkNotificationReadUseCase(new MemoryNotifications(sample)).execute(
      "n1",
      "u1",
    );
    expect(result.readAt).not.toBeNull();
  });

  test("forbids another recipient", async () => {
    expect(
      new MarkNotificationReadUseCase(new MemoryNotifications(sample)).execute("n1", "u2"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("throws when missing", async () => {
    expect(
      new MarkNotificationReadUseCase(new MemoryNotifications(sample)).execute("n-missing", "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
