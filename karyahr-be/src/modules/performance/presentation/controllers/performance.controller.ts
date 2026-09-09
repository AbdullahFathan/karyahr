import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError } from "../../../../shared/errors/app-error";
import { routeParam } from "../../../../shared/utils/route-param";
import type {
  ApproveGoalUseCase,
  CloseGoalUseCase,
  CreateGoalUseCase,
  GetGoalUseCase,
  ListGoalsUseCase,
  RejectGoalUseCase,
  SubmitGoalUseCase,
  UpdateGoalProgressUseCase,
  UpdateGoalUseCase,
} from "../../domain/usecases/Goal.usecase";
import type {
  CreateCycleUseCase,
  GetCycleUseCase,
  ListCyclesUseCase,
  LockCycleUseCase,
  OpenCycleUseCase,
  UpdateCycleUseCase,
} from "../../domain/usecases/Cycle.usecase";
import type {
  AssignPeersUseCase,
  CompleteReviewUseCase,
  GetReviewUseCase,
  ListEmployeeReviewsUseCase,
  ListMyReviewsUseCase,
  SubmitRatingUseCase,
} from "../../domain/usecases/Review.usecase";
import type {
  GetDepartmentHeatmapUseCase,
  GetTeamDistributionUseCase,
} from "../../domain/usecases/PerformanceDashboard.usecase";
import {
  assignPeersSchema,
  createCycleSchema,
  createGoalSchema,
  dashboardQuerySchema,
  listGoalsQuerySchema,
  submitRatingSchema,
  updateCycleSchema,
  updateGoalSchema,
  updateProgressSchema,
} from "../schemas/performance.schema";

function actor(req: Request) {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return {
    userId: req.auth.userId,
    employeeId: req.auth.employeeId,
    permissionKeys: req.auth.permissionKeys,
  };
}

/**
 * HTTP handlers for goals, review cycles, ratings, and dashboards.
 */
export function createPerformanceController(deps: {
  readonly createGoal: CreateGoalUseCase;
  readonly updateGoal: UpdateGoalUseCase;
  readonly progressGoal: UpdateGoalProgressUseCase;
  readonly submitGoal: SubmitGoalUseCase;
  readonly approveGoal: ApproveGoalUseCase;
  readonly rejectGoal: RejectGoalUseCase;
  readonly closeGoal: CloseGoalUseCase;
  readonly listGoals: ListGoalsUseCase;
  readonly getGoal: GetGoalUseCase;
  readonly createCycle: CreateCycleUseCase;
  readonly updateCycle: UpdateCycleUseCase;
  readonly openCycle: OpenCycleUseCase;
  readonly lockCycle: LockCycleUseCase;
  readonly listCycles: ListCyclesUseCase;
  readonly getCycle: GetCycleUseCase;
  readonly getReview: GetReviewUseCase;
  readonly listMyReviews: ListMyReviewsUseCase;
  readonly listEmployeeReviews: ListEmployeeReviewsUseCase;
  readonly assignPeers: AssignPeersUseCase;
  readonly submitRating: SubmitRatingUseCase;
  readonly completeReview: CompleteReviewUseCase;
  readonly teamDashboard: GetTeamDistributionUseCase;
  readonly heatmap: GetDepartmentHeatmapUseCase;
}) {
  return {
    createGoal: asyncHandler(async (req: Request, res: Response) => {
      const body = createGoalSchema.parse(req.body);
      const item = await deps.createGoal.execute(actor(req), {
        ...body,
        parentGoalId: body.parentGoalId ?? null,
        departmentId: body.departmentId ?? null,
        employeeId: body.employeeId ?? null,
      });
      res.status(201).json({ data: item });
    }),
    updateGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.updateGoal.execute(
        actor(req),
        routeParam(req.params.id, "id"),
        updateGoalSchema.parse(req.body),
      );
      res.status(200).json({ data: item });
    }),
    progressGoal: asyncHandler(async (req: Request, res: Response) => {
      const body = updateProgressSchema.parse(req.body);
      const item = await deps.progressGoal.execute(actor(req), routeParam(req.params.id, "id"), body.keyResults);
      res.status(200).json({ data: item });
    }),
    submitGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.submitGoal.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    approveGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.approveGoal.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    rejectGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.rejectGoal.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    completeGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.closeGoal.execute(actor(req), routeParam(req.params.id, "id"), "COMPLETED");
      res.status(200).json({ data: item });
    }),
    cancelGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.closeGoal.execute(actor(req), routeParam(req.params.id, "id"), "CANCELLED");
      res.status(200).json({ data: item });
    }),
    listGoals: asyncHandler(async (req: Request, res: Response) => {
      const query = listGoalsQuerySchema.parse(req.query);
      res.status(200).json({ data: await deps.listGoals.execute(actor(req), query) });
    }),
    listMyGoals: asyncHandler(async (req: Request, res: Response) => {
      res.status(200).json({ data: await deps.listGoals.execute(actor(req), { mine: true }) });
    }),
    getGoal: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.getGoal.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    createCycle: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.createCycle.execute(actor(req), createCycleSchema.parse(req.body));
      res.status(201).json({ data: item });
    }),
    updateCycle: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.updateCycle.execute(
        actor(req),
        routeParam(req.params.id, "id"),
        updateCycleSchema.parse(req.body),
      );
      res.status(200).json({ data: item });
    }),
    openCycle: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.openCycle.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    lockCycle: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.lockCycle.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    listCycles: asyncHandler(async (req: Request, res: Response) => {
      res.status(200).json({ data: await deps.listCycles.execute() });
    }),
    getCycle: asyncHandler(async (req: Request, res: Response) => {
      res.status(200).json({ data: await deps.getCycle.execute(routeParam(req.params.id, "id")) });
    }),
    getReview: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.getReview.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    listMyReviews: asyncHandler(async (req: Request, res: Response) => {
      res.status(200).json({ data: await deps.listMyReviews.execute(actor(req)) });
    }),
    listEmployeeReviews: asyncHandler(async (req: Request, res: Response) => {
      const items = await deps.listEmployeeReviews.execute(actor(req), routeParam(req.params.employeeId, "employeeId"));
      res.status(200).json({ data: items });
    }),
    assignPeers: asyncHandler(async (req: Request, res: Response) => {
      const body = assignPeersSchema.parse(req.body);
      const items = await deps.assignPeers.execute(
        actor(req),
        routeParam(req.params.id, "id"),
        body.peerEmployeeIds,
      );
      res.status(200).json({ data: items });
    }),
    submitRating: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.submitRating.execute(
        actor(req),
        routeParam(req.params.id, "id"),
        submitRatingSchema.parse(req.body),
      );
      res.status(201).json({ data: item });
    }),
    completeReview: asyncHandler(async (req: Request, res: Response) => {
      const item = await deps.completeReview.execute(actor(req), routeParam(req.params.id, "id"));
      res.status(200).json({ data: item });
    }),
    teamDashboard: asyncHandler(async (req: Request, res: Response) => {
      const query = dashboardQuerySchema.parse(req.query);
      const item = await deps.teamDashboard.execute(actor(req), query.cycleId, query.managerId);
      res.status(200).json({ data: item });
    }),
    heatmap: asyncHandler(async (req: Request, res: Response) => {
      const query = dashboardQuerySchema.parse(req.query);
      const item = await deps.heatmap.execute(actor(req), query.cycleId);
      res.status(200).json({ data: item });
    }),
  };
}
