import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import type { IUserRepository } from "../../../auth/domain/repositories/IUserRepository";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type {
  PerformancePeerAssignment,
  PerformanceRaterType,
  PerformanceRating,
  PerformanceReview,
  PerformanceReviewDetail,
} from "../entities/Performance";
import { assertScoreRange, averageScore, recommendationFromScore } from "../performance-invariants";
import type { ICycleRepository, IReviewRepository } from "../repositories/IPerformanceRepository";
import type { PerformanceActor } from "./Goal.usecase";

function isHr(actor: PerformanceActor): boolean {
  return actor.permissionKeys.includes(PERMISSIONS.PERFORMANCE_CYCLES_WRITE);
}

function has(actor: PerformanceActor, key: string): boolean {
  return actor.permissionKeys.includes(key);
}

async function assertCanViewReview(
  actor: PerformanceActor,
  review: PerformanceReview,
  employees: IEmployeeRepository,
): Promise<void> {
  if (isHr(actor) || review.employeeId === actor.employeeId) {
    return;
  }
  if (has(actor, PERMISSIONS.PERFORMANCE_REVIEWS_READ) || has(actor, PERMISSIONS.PERFORMANCE_REVIEWS_WRITE)) {
    const subject = await employees.findById(review.employeeId);
    if (subject?.managerId === actor.employeeId) {
      return;
    }
  }
  const detailPeers = "peers" in review ? (review as PerformanceReviewDetail).peers : [];
  if (detailPeers.some((peer) => peer.peerEmployeeId === actor.employeeId)) {
    return;
  }
  throw new ForbiddenError("Not allowed to view this review");
}

/**
 * Loads a review with ratings and peer assignments.
 */
export class GetReviewUseCase {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
  ) {}

  async execute(actor: PerformanceActor, id: string): Promise<PerformanceReviewDetail> {
    const review = await this.reviews.findById(id);
    if (!review) {
      throw new NotFoundError("Review not found");
    }
    await assertCanViewReview(actor, review, this.employees);
    return review;
  }
}

/**
 * Lists reviews for the authenticated employee.
 */
export class ListMyReviewsUseCase {
  constructor(private readonly reviews: IReviewRepository) {}

  async execute(actor: PerformanceActor): Promise<readonly PerformanceReview[]> {
    return this.reviews.listByEmployee(actor.employeeId);
  }
}

/**
 * Lists review history for an employee.
 */
export class ListEmployeeReviewsUseCase {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
  ) {}

  async execute(actor: PerformanceActor, employeeId: string): Promise<readonly PerformanceReview[]> {
    const dummy: PerformanceReview = {
      id: "scope",
      cycleId: "",
      employeeId,
      status: "PENDING",
      finalScore: null,
      recommendation: null,
    };
    await assertCanViewReview(actor, dummy, this.employees);
    return this.reviews.listByEmployee(employeeId);
  }
}

/**
 * Replaces peer raters on an open review.
 */
export class AssignPeersUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    reviewId: string,
    peerEmployeeIds: readonly string[],
  ): Promise<readonly PerformancePeerAssignment[]> {
    const review = await this.reviews.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review not found");
    }
    const cycle = await this.cycles.findById(review.cycleId);
    if (!cycle || cycle.status !== "OPEN") {
      throw new ValidationError("Peers can only be assigned while the cycle is open");
    }
    if (review.status === "COMPLETED") {
      throw new ValidationError("Cannot assign peers on a completed review");
    }
    const subject = await this.employees.findById(review.employeeId);
    if (!subject) {
      throw new NotFoundError("Employee not found");
    }
    const isManager = subject.managerId === actor.employeeId;
    if (!isManager && !isHr(actor) && !has(actor, PERMISSIONS.PERFORMANCE_REVIEWS_WRITE)) {
      throw new ForbiddenError("Not allowed to assign peers");
    }
    if (peerEmployeeIds.includes(review.employeeId)) {
      throw new ValidationError("The employee cannot peer-review themselves");
    }
    await Promise.all(
      peerEmployeeIds.map(async (peerId) => {
        const peer = await this.employees.findById(peerId);
        if (!peer) {
          throw new NotFoundError("Peer employee not found");
        }
      }),
    );
    const peers = await this.reviews.replacePeers(reviewId, peerEmployeeIds);
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceReview",
      entityId: reviewId,
      action: "assign_peers",
    });
    return peers;
  }
}

/**
 * Submits a self, manager, or peer rating.
 */
export class SubmitRatingUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
    private readonly users: IUserRepository,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    actor: PerformanceActor,
    reviewId: string,
    input: { readonly raterType: PerformanceRaterType; readonly score: number; readonly comment: string },
  ): Promise<PerformanceRating> {
    assertScoreRange(input.score);
    const review = await this.reviews.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review not found");
    }
    const cycle = await this.cycles.findById(review.cycleId);
    if (!cycle || cycle.status !== "OPEN") {
      throw new ValidationError("Ratings can only be submitted while the cycle is open");
    }
    if (review.status === "COMPLETED") {
      throw new ValidationError("Review is already completed");
    }
    const existing = await this.reviews.findRating(reviewId, actor.employeeId);
    if (existing) {
      throw new ConflictError("This rater already submitted a rating");
    }
    const subject = await this.employees.findById(review.employeeId);
    if (!subject) {
      throw new NotFoundError("Employee not found");
    }
    if (input.raterType === "SELF" && actor.employeeId !== review.employeeId) {
      throw new ForbiddenError("Only the employee can submit a self rating");
    }
    if (input.raterType === "MANAGER" && subject.managerId !== actor.employeeId) {
      throw new ForbiddenError("Only the manager can submit a manager rating");
    }
    if (input.raterType === "PEER") {
      const assigned = review.peers.some((peer) => peer.peerEmployeeId === actor.employeeId);
      if (!assigned) {
        throw new ForbiddenError("Only assigned peers can submit a peer rating");
      }
    }
    const rating = await this.reviews.addRating({
      reviewId,
      raterEmployeeId: actor.employeeId,
      raterType: input.raterType,
      score: input.score,
      comment: input.comment,
      submittedAt: new Date(),
    });
    if (review.status === "PENDING") {
      await this.reviews.updateReview(reviewId, { status: "IN_PROGRESS" });
    }
    const subjectUser = await this.users.findByEmployeeId(review.employeeId);
    if (subjectUser && actor.employeeId !== review.employeeId) {
      await this.dispatcher.dispatch({
        type: "performance.rating_submitted",
        recipientUserId: subjectUser.id,
        title: "New performance rating",
        body: `A ${input.raterType.toLowerCase()} rating was submitted for your review.`,
        entityType: "PerformanceReview",
        entityId: reviewId,
      });
    }
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceRating",
      entityId: rating.id,
      action: "submit",
      metadata: { reviewId, raterType: input.raterType },
    });
    return rating;
  }
}

/**
 * Finalizes a review after self and manager ratings exist.
 */
export class CompleteReviewUseCase {
  constructor(
    private readonly cycles: ICycleRepository,
    private readonly reviews: IReviewRepository,
    private readonly employees: IEmployeeRepository,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(actor: PerformanceActor, reviewId: string): Promise<PerformanceReview> {
    const review = await this.reviews.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review not found");
    }
    const cycle = await this.cycles.findById(review.cycleId);
    if (!cycle || cycle.status !== "OPEN") {
      throw new ValidationError("Reviews can only be completed while the cycle is open");
    }
    if (review.status === "COMPLETED") {
      throw new ValidationError("Review is already completed");
    }
    const subject = await this.employees.findById(review.employeeId);
    const isManager = subject?.managerId === actor.employeeId;
    if (!isManager && !isHr(actor) && !has(actor, PERMISSIONS.PERFORMANCE_REVIEWS_WRITE)) {
      throw new ForbiddenError("Not allowed to complete this review");
    }
    const hasSelf = review.ratings.some((item) => item.raterType === "SELF");
    const hasManager = review.ratings.some((item) => item.raterType === "MANAGER");
    if (!hasSelf || !hasManager) {
      throw new ValidationError("Self and manager ratings are required to complete a review");
    }
    const finalScore = averageScore(review.ratings.map((item) => item.score));
    const completed = await this.reviews.updateReview(reviewId, {
      status: "COMPLETED",
      finalScore,
      recommendation: recommendationFromScore(finalScore),
    });
    await this.audit.append({
      actorUserId: actor.userId,
      entityType: "PerformanceReview",
      entityId: reviewId,
      action: "complete",
      metadata: { finalScore, recommendation: completed.recommendation },
    });
    return completed;
  }
}
