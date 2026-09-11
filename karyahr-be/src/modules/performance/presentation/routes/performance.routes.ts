import { Router } from "express";
import { PrismaAuditLogRepository } from "../../../../shared/audit/PrismaAuditLogRepository";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requireAnyPermission, requirePermission } from "../../../../shared/middleware/require-permission";
import { PrismaUserRepository } from "../../../auth/data/PrismaUserRepository";
import { PrismaEmployeeRepository } from "../../../employees/data/PrismaEmployeeRepository";
import { QueueNotificationDispatcher } from "../../../notifications/data/QueueNotificationDispatcher";
import {
  PrismaCycleRepository,
  PrismaGoalRepository,
  PrismaReviewRepository,
} from "../../data/PrismaPerformanceRepository";
import {
  CreateCycleUseCase,
  GetCycleUseCase,
  ListCyclesUseCase,
  LockCycleUseCase,
  OpenCycleUseCase,
  UpdateCycleUseCase,
} from "../../domain/usecases/Cycle.usecase";
import {
  ApproveGoalUseCase,
  CloseGoalUseCase,
  CreateGoalUseCase,
  DecideGoalUseCase,
  GetGoalUseCase,
  ListGoalsUseCase,
  RejectGoalUseCase,
  SubmitGoalUseCase,
  UpdateGoalProgressUseCase,
  UpdateGoalUseCase,
} from "../../domain/usecases/Goal.usecase";
import {
  GetDepartmentHeatmapUseCase,
  GetTeamDistributionUseCase,
} from "../../domain/usecases/PerformanceDashboard.usecase";
import {
  AssignPeersUseCase,
  CompleteReviewUseCase,
  GetReviewUseCase,
  ListEmployeeReviewsUseCase,
  ListMyReviewsUseCase,
  SubmitRatingUseCase,
} from "../../domain/usecases/Review.usecase";
import { createPerformanceController } from "../controllers/performance.controller";

/**
 * Registers performance goal, cycle, review, and dashboard routes.
 */
export function createPerformanceRouter(): Router {
  const prisma = getPrisma();
  const audit = new PrismaAuditLogRepository(prisma);
  const goals = new PrismaGoalRepository(prisma);
  const cycles = new PrismaCycleRepository(prisma);
  const reviews = new PrismaReviewRepository(prisma);
  const employees = new PrismaEmployeeRepository(prisma);
  const users = new PrismaUserRepository(prisma);
  const dispatcher = new QueueNotificationDispatcher();
  const decideGoal = new DecideGoalUseCase(goals, employees, users, dispatcher, audit);

  const controller = createPerformanceController({
    createGoal: new CreateGoalUseCase(goals, employees, audit),
    updateGoal: new UpdateGoalUseCase(goals, audit),
    progressGoal: new UpdateGoalProgressUseCase(goals, audit),
    submitGoal: new SubmitGoalUseCase(goals, employees, users, dispatcher, audit),
    approveGoal: new ApproveGoalUseCase(decideGoal),
    rejectGoal: new RejectGoalUseCase(decideGoal),
    closeGoal: new CloseGoalUseCase(goals, audit),
    listGoals: new ListGoalsUseCase(goals, employees),
    getGoal: new GetGoalUseCase(goals, employees),
    createCycle: new CreateCycleUseCase(cycles, audit),
    updateCycle: new UpdateCycleUseCase(cycles, audit),
    openCycle: new OpenCycleUseCase(cycles, reviews, employees, users, dispatcher, audit),
    lockCycle: new LockCycleUseCase(cycles, audit),
    listCycles: new ListCyclesUseCase(cycles),
    getCycle: new GetCycleUseCase(cycles),
    getReview: new GetReviewUseCase(reviews, employees),
    listMyReviews: new ListMyReviewsUseCase(reviews),
    listEmployeeReviews: new ListEmployeeReviewsUseCase(reviews, employees),
    assignPeers: new AssignPeersUseCase(cycles, reviews, employees, audit),
    submitRating: new SubmitRatingUseCase(cycles, reviews, employees, users, dispatcher, audit),
    completeReview: new CompleteReviewUseCase(cycles, reviews, employees, audit),
    teamDashboard: new GetTeamDistributionUseCase(cycles, reviews, employees),
    heatmap: new GetDepartmentHeatmapUseCase(cycles, reviews),
  });

  const router = Router();
  router.post(
    "/performance/goals",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_GOALS_ME, PERMISSIONS.PERFORMANCE_GOALS_WRITE),
    controller.createGoal,
  );
  router.get(
    "/performance/goals/me",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_GOALS_ME),
    controller.listMyGoals,
  );
  router.get("/performance/goals", requireAuth, requirePermission(PERMISSIONS.PERFORMANCE_GOALS_READ), controller.listGoals);
  router.get(
    "/performance/goals/:id",
    requireAuth,
    requireAnyPermission(
      PERMISSIONS.PERFORMANCE_GOALS_ME,
      PERMISSIONS.PERFORMANCE_GOALS_READ,
      PERMISSIONS.PERFORMANCE_GOALS_WRITE,
    ),
    controller.getGoal,
  );
  router.patch(
    "/performance/goals/:id",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_GOALS_ME, PERMISSIONS.PERFORMANCE_GOALS_WRITE),
    controller.updateGoal,
  );
  router.post(
    "/performance/goals/:id/progress",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_GOALS_ME, PERMISSIONS.PERFORMANCE_GOALS_WRITE),
    controller.progressGoal,
  );
  router.post(
    "/performance/goals/:id/submit",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_GOALS_ME, PERMISSIONS.PERFORMANCE_GOALS_WRITE),
    controller.submitGoal,
  );
  router.post(
    "/performance/goals/:id/approve",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_GOALS_APPROVE),
    controller.approveGoal,
  );
  router.post(
    "/performance/goals/:id/reject",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_GOALS_APPROVE),
    controller.rejectGoal,
  );
  router.post(
    "/performance/goals/:id/complete",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_GOALS_ME, PERMISSIONS.PERFORMANCE_GOALS_WRITE),
    controller.completeGoal,
  );
  router.post(
    "/performance/goals/:id/cancel",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_GOALS_ME, PERMISSIONS.PERFORMANCE_GOALS_WRITE),
    controller.cancelGoal,
  );

  router.get("/performance/cycles", requireAuth, requirePermission(PERMISSIONS.PERFORMANCE_REVIEWS_ME), controller.listCycles);
  router.get("/performance/cycles/:id", requireAuth, requirePermission(PERMISSIONS.PERFORMANCE_REVIEWS_ME), controller.getCycle);
  router.post(
    "/performance/cycles",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_CYCLES_WRITE),
    controller.createCycle,
  );
  router.patch(
    "/performance/cycles/:id",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_CYCLES_WRITE),
    controller.updateCycle,
  );
  router.post(
    "/performance/cycles/:id/open",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_CYCLES_WRITE),
    controller.openCycle,
  );
  router.post(
    "/performance/cycles/:id/lock",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_CYCLES_WRITE),
    controller.lockCycle,
  );

  router.get(
    "/performance/reviews/me",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_REVIEWS_ME),
    controller.listMyReviews,
  );
  router.get(
    "/performance/reviews/:id",
    requireAuth,
    requireAnyPermission(
      PERMISSIONS.PERFORMANCE_REVIEWS_ME,
      PERMISSIONS.PERFORMANCE_REVIEWS_READ,
      PERMISSIONS.PERFORMANCE_REVIEWS_WRITE,
    ),
    controller.getReview,
  );
  router.post(
    "/performance/reviews/:id/peers",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_REVIEWS_WRITE),
    controller.assignPeers,
  );
  router.post(
    "/performance/reviews/:id/ratings",
    requireAuth,
    requireAnyPermission(PERMISSIONS.PERFORMANCE_REVIEWS_ME, PERMISSIONS.PERFORMANCE_REVIEWS_WRITE),
    controller.submitRating,
  );
  router.post(
    "/performance/reviews/:id/complete",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_REVIEWS_WRITE),
    controller.completeReview,
  );
  router.get(
    "/performance/employees/:employeeId/reviews",
    requireAuth,
    requireAnyPermission(
      PERMISSIONS.PERFORMANCE_REVIEWS_ME,
      PERMISSIONS.PERFORMANCE_REVIEWS_READ,
      PERMISSIONS.PERFORMANCE_REVIEWS_WRITE,
    ),
    controller.listEmployeeReviews,
  );

  router.get(
    "/performance/dashboard/team",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_DASHBOARD),
    controller.teamDashboard,
  );
  router.get(
    "/performance/dashboard/heatmap",
    requireAuth,
    requirePermission(PERMISSIONS.PERFORMANCE_DASHBOARD),
    controller.heatmap,
  );

  return router;
}
