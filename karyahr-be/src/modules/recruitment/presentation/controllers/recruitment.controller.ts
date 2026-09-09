import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import { UnauthorizedError, ValidationError } from "../../../../shared/errors/app-error";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { routeParam } from "../../../../shared/utils/route-param";
import { parsePagination, paginationMeta } from "../../../../shared/utils/pagination";
import type { ApplyToJobUseCase } from "../../domain/usecases/Apply.usecase";
import type { ConvertCandidateUseCase } from "../../domain/usecases/ConvertCandidate.usecase";
import type {
  CreateJobPostingUseCase,
  GetJobPostingUseCase,
  GetPublicCareerUseCase,
  ListJobPostingsUseCase,
  ListPublicCareersUseCase,
  ReplaceJobStagesUseCase,
  UpdateJobPostingUseCase,
} from "../../domain/usecases/JobPosting.usecase";
import type {
  AddOnboardingTemplateItemUseCase,
  CompleteOnboardingTaskUseCase,
  CreateOnboardingTemplateUseCase,
  DeleteOnboardingTemplateItemUseCase,
  GetOnboardingProcessUseCase,
  ListOnboardingDashboardUseCase,
  ListOnboardingTemplatesUseCase,
  UpdateOnboardingTemplateItemUseCase,
  UpdateOnboardingTemplateUseCase,
} from "../../domain/usecases/Onboarding.usecase";
import type {
  AddApplicationNoteUseCase,
  GetApplicationUseCase,
  ListApplicationsUseCase,
  MoveApplicationStageUseCase,
  RejectApplicationUseCase,
} from "../../domain/usecases/Pipeline.usecase";
import {
  addNoteSchema,
  applySchema,
  createJobPostingSchema,
  createOnboardingItemSchema,
  createOnboardingTemplateSchema,
  hireCandidateSchema,
  listJobsQuerySchema,
  moveStageSchema,
  replaceStagesSchema,
  updateJobPostingSchema,
  updateOnboardingItemSchema,
  updateOnboardingTemplateSchema,
} from "../schemas/recruitment.schema";

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

function uploadFrom(req: Request) {
  const file = req.file;
  return file
    ? { buffer: file.buffer, fileName: file.originalname, contentType: file.mimetype }
    : undefined;
}

/**
 * HTTP handlers for careers, ATS, and onboarding.
 */
export function createRecruitmentController(deps: {
  readonly createJob: CreateJobPostingUseCase;
  readonly updateJob: UpdateJobPostingUseCase;
  readonly listJobs: ListJobPostingsUseCase;
  readonly getJob: GetJobPostingUseCase;
  readonly replaceStages: ReplaceJobStagesUseCase;
  readonly listCareers: ListPublicCareersUseCase;
  readonly getCareer: GetPublicCareerUseCase;
  readonly apply: ApplyToJobUseCase;
  readonly listApplications: ListApplicationsUseCase;
  readonly getApplication: GetApplicationUseCase;
  readonly moveStage: MoveApplicationStageUseCase;
  readonly addNote: AddApplicationNoteUseCase;
  readonly reject: RejectApplicationUseCase;
  readonly hire: ConvertCandidateUseCase;
  readonly createTemplate: CreateOnboardingTemplateUseCase;
  readonly updateTemplate: UpdateOnboardingTemplateUseCase;
  readonly listTemplates: ListOnboardingTemplatesUseCase;
  readonly addTemplateItem: AddOnboardingTemplateItemUseCase;
  readonly updateTemplateItem: UpdateOnboardingTemplateItemUseCase;
  readonly deleteTemplateItem: DeleteOnboardingTemplateItemUseCase;
  readonly getProcess: GetOnboardingProcessUseCase;
  readonly completeTask: CompleteOnboardingTaskUseCase;
  readonly dashboard: ListOnboardingDashboardUseCase;
}) {
  const createJob = asyncHandler(async (req: Request, res: Response) => {
    const body = createJobPostingSchema.parse(req.body);
    const item = await deps.createJob.execute(
      {
        title: body.title,
        slug: body.slug,
        description: body.description,
        qualifications: body.qualifications,
        departmentId: body.departmentId,
        positionId: body.positionId,
        headcount: body.headcount,
        maxApplicants: body.maxApplicants,
        closesAt: body.closesAt ?? null,
        status: body.status,
        stages: body.stages,
      },
      actor(req).userId,
    );
    res.status(201).json({ data: item });
  });

  const updateJob = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.updateJob.execute(
      routeParam(req.params.id, "id"),
      updateJobPostingSchema.parse(req.body),
      actor(req).userId,
    );
    res.status(200).json({ data: item });
  });

  const listJobs = asyncHandler(async (req: Request, res: Response) => {
    const query = listJobsQuerySchema.parse(req.query);
    const pagination = parsePagination({ page: query.page, pageSize: query.pageSize });
    const result = await deps.listJobs.execute({ status: query.status, pagination });
    res.status(200).json({
      data: result.items,
      meta: paginationMeta(result.total, pagination.page, pagination.pageSize),
    });
  });

  const getJob = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await deps.getJob.execute(routeParam(req.params.id, "id")) });
  });

  const replaceStages = asyncHandler(async (req: Request, res: Response) => {
    const body = replaceStagesSchema.parse(req.body);
    const items = await deps.replaceStages.execute(
      routeParam(req.params.id, "id"),
      body.stages,
      actor(req).userId,
    );
    res.status(200).json({ data: items });
  });

  const listCareers = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listCareers.execute() });
  });

  const getCareer = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await deps.getCareer.execute(routeParam(req.params.slug, "slug")) });
  });

  const publicApply = asyncHandler(async (req: Request, res: Response) => {
    const body = applySchema.parse(req.body);
    const item = await deps.apply.execute(
      { slug: routeParam(req.params.slug, "slug") },
      {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        nationalId: body.nationalId,
        file: uploadFrom(req),
      },
      null,
    );
    res.status(201).json({ data: item });
  });

  const hrApply = asyncHandler(async (req: Request, res: Response) => {
    const body = applySchema.parse(req.body);
    if (!body.jobPostingId) {
      throw new ValidationError("jobPostingId is required");
    }
    const item = await deps.apply.execute(
      { id: body.jobPostingId },
      {
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        nationalId: body.nationalId,
        file: uploadFrom(req),
      },
      actor(req).userId,
    );
    res.status(201).json({ data: item });
  });

  const listApplications = asyncHandler(async (req: Request, res: Response) => {
    const query = listJobsQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const result = await deps.listApplications.execute(routeParam(req.params.id, "id"), pagination);
    res.status(200).json({
      data: result.items,
      meta: paginationMeta(result.total, pagination.page, pagination.pageSize),
    });
  });

  const getApplication = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({ data: await deps.getApplication.execute(routeParam(req.params.id, "id")) });
  });

  const moveStage = asyncHandler(async (req: Request, res: Response) => {
    const body = moveStageSchema.parse(req.body);
    const item = await deps.moveStage.execute(
      routeParam(req.params.id, "id"),
      body.stageId,
      actor(req).userId,
    );
    res.status(200).json({ data: item });
  });

  const addNote = asyncHandler(async (req: Request, res: Response) => {
    const body = addNoteSchema.parse(req.body);
    const item = await deps.addNote.execute(
      routeParam(req.params.id, "id"),
      { body: body.body, rating: body.rating },
      actor(req).userId,
    );
    res.status(201).json({ data: item });
  });

  const reject = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.reject.execute(routeParam(req.params.id, "id"), actor(req).userId);
    res.status(200).json({ data: item });
  });

  const hire = asyncHandler(async (req: Request, res: Response) => {
    const body = hireCandidateSchema.parse(req.body);
    const item = await deps.hire.execute(
      routeParam(req.params.id, "id"),
      {
        nationalId: body.nationalId,
        birthDate: body.birthDate,
        address: body.address,
        phone: body.phone,
        emergencyContact: body.emergencyContact,
        employeeNumber: body.employeeNumber,
        managerId: body.managerId,
        joinedAt: body.joinedAt,
        contractType: body.contractType,
      },
      actor(req).userId,
    );
    res.status(200).json({ data: item });
  });

  const createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const body = createOnboardingTemplateSchema.parse(req.body);
    const item = await deps.createTemplate.execute(
      { name: body.name, positionId: body.positionId ?? null },
      actor(req).userId,
    );
    res.status(201).json({ data: item });
  });

  const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const body = updateOnboardingTemplateSchema.parse(req.body);
    const item = await deps.updateTemplate.execute(routeParam(req.params.id, "id"), {
      name: body.name,
      positionId: body.positionId,
    });
    res.status(200).json({ data: item });
  });

  const listTemplates = asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ data: await deps.listTemplates.execute() });
  });

  const addTemplateItem = asyncHandler(async (req: Request, res: Response) => {
    const body = createOnboardingItemSchema.parse(req.body);
    const item = await deps.addTemplateItem.execute({
      templateId: routeParam(req.params.id, "id"),
      title: body.title,
      description: body.description,
      assigneeKind: body.assigneeKind,
      sortOrder: body.sortOrder,
    });
    res.status(201).json({ data: item });
  });

  const updateTemplateItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await deps.updateTemplateItem.execute(
      routeParam(req.params.id, "id"),
      updateOnboardingItemSchema.parse(req.body),
    );
    res.status(200).json({ data: item });
  });

  const deleteTemplateItem = asyncHandler(async (req: Request, res: Response) => {
    await deps.deleteTemplateItem.execute(routeParam(req.params.id, "id"));
    res.status(204).send();
  });

  const getProcess = asyncHandler(async (req: Request, res: Response) => {
    const process = await deps.getProcess.execute(routeParam(req.params.employeeId, "employeeId"));
    res.status(200).json({ data: process });
  });

  const getMyProcess = asyncHandler(async (req: Request, res: Response) => {
    const process = await deps.getProcess.execute(actor(req).employeeId);
    res.status(200).json({ data: process });
  });

  const completeTask = asyncHandler(async (req: Request, res: Response) => {
    const process = await deps.completeTask.execute(routeParam(req.params.id, "id"), actor(req));
    res.status(200).json({ data: process });
  });

  const dashboard = asyncHandler(async (req: Request, res: Response) => {
    const query = listJobsQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const result = await deps.dashboard.execute(pagination);
    res.status(200).json({
      data: result.items,
      meta: paginationMeta(result.total, pagination.page, pagination.pageSize),
    });
  });

  return {
    createJob,
    updateJob,
    listJobs,
    getJob,
    replaceStages,
    listCareers,
    getCareer,
    publicApply,
    hrApply,
    listApplications,
    getApplication,
    moveStage,
    addNote,
    reject,
    hire,
    createTemplate,
    updateTemplate,
    listTemplates,
    addTemplateItem,
    updateTemplateItem,
    deleteTemplateItem,
    getProcess,
    getMyProcess,
    completeTask,
    dashboard,
  };
}
