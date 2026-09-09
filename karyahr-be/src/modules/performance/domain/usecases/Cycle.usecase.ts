import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { PerformanceCycle, PerformancePeriodType } from "../entities/Performance";
import type { ICycleRepository, IReviewRepository } from "../repositories/IPerformanceRepository";
import type { PerformanceActor } from "./Goal.usecase";

/**
 * Creates a draft review cycle.
 */
export class CreateCycleUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    input: {
      readonly name: string;
      readonly periodType: PerformancePeriodType;
      readonly startsAt: Date;
      readonly endsAt: Date;
    },
  ): Promise<PerformanceCycle> {
    if (input.endsAt < input.startsAt) {
      throw new ValidationError("Cycle end date must be on or after the start date");
    }
    const created = await this.cycles.create(input);
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceCycle",
      entityId: created.id,
      action: "create",
    });
    return created;
  }
}

/**
 * Updates a draft cycle.
 */
export class UpdateCycleUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    id: string,
    input: {
      readonly name?: string;
      readonly periodType?: PerformancePeriodType;
      readonly startsAt?: Date;
      readonly endsAt?: Date;
    },
  ): Promise<PerformanceCycle> {
    const cycle = await this.cycles.findById(id);
    if (!cycle) {
      throw new NotFoundError("Review cycle not found");
    }
    if (cycle.status !== "DRAFT") {
      throw new ValidationError("Only draft cycles can be edited");
    }
    const startsAt = input.startsAt ?? cycle.startsAt;
    const endsAt = input.endsAt ?? cycle.endsAt;
    if (endsAt < startsAt) {
      throw new ValidationError("Cycle end date must be on or after the start date");
    }
    const updated = await this.cycles.update(id, input);
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceCycle",
      entityId: id,
      action: "update",
    });
    return updated;
  }
}

/**
 * Opens a cycle and creates a review per active or probation employee.
 */
export class OpenCycleUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(actor: PerformanceActor, id: string): Promise<PerformanceCycle> {
    const cycle = await this.cycles.findById(id);
    if (!cycle) {
      throw new NotFoundError("Review cycle not found");
    }
    if (cycle.status !== "DRAFT") {
      throw new ValidationError("Only draft cycles can be opened");
    }
    const directory = await this.employees.listDirectory({
      statuses: ["ACTIVE", "PROBATION"],
    });
    await this.reviews.createMany(
      id,
      directory.map((item) => item.id),
    );
    const opened = await this.cycles.setStatus(id, "OPEN");
    await Promise.all(
      directory.map(async (employee) => {
        const user = await this.users.findByEmployeeId(employee.id);
        if (!user) {
          return;
        }
        await this.dispatcher.dispatch({
          type: "performance.review_opened",
          recipientUserId: user.id,
          title: "Performance review opened",
          body: `${cycle.name} is open. Complete your self-assessment.`,
          entityType: "PerformanceCycle",
          entityId: cycle.id,
        });
      }),
    );
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceCycle",
      entityId: id,
      action: "open",
      metadata: { reviewCount: directory.length },
    });
    return opened;
  }
}

/**
 * Locks an open cycle so ratings can no longer change.
 */
export class LockCycleUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(actor: PerformanceActor, id: string): Promise<PerformanceCycle> {
    const cycle = await this.cycles.findById(id);
    if (!cycle) {
      throw new NotFoundError("Review cycle not found");
    }
    if (cycle.status !== "OPEN") {
      throw new ValidationError("Only open cycles can be locked");
    }
    const locked = await this.cycles.setStatus(id, "LOCKED");
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceCycle",
      entityId: id,
      action: "lock",
    });
    return locked;
  }
}

/**
 * Lists review cycles.
 */
export class ListCyclesUseCase {
  constructor(private readonly cycles: ICycleRepository) {}

  async execute(): Promise<readonly PerformanceCycle[]> {
    return this.cycles.list();
  }
}

/**
 * Loads a review cycle.
 */
export class GetCycleUseCase {
  constructor(private readonly cycles: ICycleRepository) {}

  async execute(id: string): Promise<PerformanceCycle> {
    const cycle = await this.cycles.findById(id);
    if (!cycle) {
      throw new NotFoundError("Review cycle not found");
    }
    return cycle;
  }
}
