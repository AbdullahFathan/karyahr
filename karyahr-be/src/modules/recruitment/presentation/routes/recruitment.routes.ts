import { Router } from "express";
import multer from "multer";
import { env } from "../../../../config/env";
import { PrismaAuditLogRepository } from "../../../../shared/audit/PrismaAuditLogRepository";
import { PERMISSIONS } from "../../../../shared/auth/permissions";
import { getPrisma } from "../../../../shared/database/prisma";
import { requireAuth } from "../../../../shared/middleware/require-auth";
import { requirePermission } from "../../../../shared/middleware/require-permission";
import { MinioObjectStorage } from "../../../../shared/storage/MinioObjectStorage";
import { PrismaUserRepository } from "../../../auth/data/PrismaUserRepository";
import { PrismaEmployeeRepository } from "../../../employees/data/PrismaEmployeeRepository";
import { CreateEmployeeUseCase } from "../../../employees/domain/usecases/EmployeeCrud.usecase";
import { QueueNotificationDispatcher } from "../../../notifications/data/QueueNotificationDispatcher";
import { HireEmployeeAdapter } from "../../data/HireEmployeeAdapter";
import {
  PrismaOnboardingProcessRepository,
  PrismaOnboardingTemplateRepository,
} from "../../data/PrismaOnboardingRepository";
import {
  PrismaApplicationAttachmentRepository,
  PrismaApplicationNoteRepository,
  PrismaApplicationRepository,
  PrismaCandidateRepository,
  PrismaJobPostingRepository,
} from "../../data/PrismaRecruitmentRepository";
import { ProvisionEmployeeUserAdapter } from "../../data/ProvisionEmployeeUserAdapter";
import { ApplyToJobUseCase } from "../../domain/usecases/Apply.usecase";
import { ConvertCandidateUseCase } from "../../domain/usecases/ConvertCandidate.usecase";
import {
  CreateJobPostingUseCase,
  GetJobPostingUseCase,
  GetPublicCareerUseCase,
  ListJobPostingsUseCase,
  ListPublicCareersUseCase,
  ReplaceJobStagesUseCase,
  UpdateJobPostingUseCase,
} from "../../domain/usecases/JobPosting.usecase";
import {
  AddOnboardingTemplateItemUseCase,
  CompleteOnboardingTaskUseCase,
  CreateOnboardingTemplateUseCase,
  DeleteOnboardingTemplateItemUseCase,
  GetOnboardingProcessUseCase,
  ListOnboardingDashboardUseCase,
  ListOnboardingTemplatesUseCase,
  StartOnboardingProcessUseCase,
  UpdateOnboardingTemplateItemUseCase,
  UpdateOnboardingTemplateUseCase,
} from "../../domain/usecases/Onboarding.usecase";
import {
  AddApplicationNoteUseCase,
  GetApplicationUseCase,
  ListApplicationsUseCase,
  MoveApplicationStageUseCase,
  RejectApplicationUseCase,
} from "../../domain/usecases/Pipeline.usecase";
import { createRecruitmentController } from "../controllers/recruitment.controller";

/**
 * Registers public career and authenticated recruitment/onboarding routes.
 */
export function createRecruitmentRouter(): Router {
  const prisma = getPrisma();
  const audit = new PrismaAuditLogRepository(prisma);
  const jobs = new PrismaJobPostingRepository(prisma);
  const candidates = new PrismaCandidateRepository(prisma);
  const applications = new PrismaApplicationRepository(prisma);
  const notes = new PrismaApplicationNoteRepository(prisma);
  const attachments = new PrismaApplicationAttachmentRepository(prisma);
  const templates = new PrismaOnboardingTemplateRepository(prisma);
  const processes = new PrismaOnboardingProcessRepository(prisma);
  const employees = new PrismaEmployeeRepository(prisma);
  const users = new PrismaUserRepository(prisma);
  const storage = new MinioObjectStorage();
  const dispatcher = new QueueNotificationDispatcher();
  const maxBytes = env().MAX_UPLOAD_BYTES;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes } });
  const startOnboarding = new StartOnboardingProcessUseCase(templates, processes);

  const controller = createRecruitmentController({
    createJob: new CreateJobPostingUseCase(jobs, audit),
    updateJob: new UpdateJobPostingUseCase(jobs, audit),
    listJobs: new ListJobPostingsUseCase(jobs),
    getJob: new GetJobPostingUseCase(jobs),
    replaceStages: new ReplaceJobStagesUseCase(jobs, audit),
    listCareers: new ListPublicCareersUseCase(jobs),
    getCareer: new GetPublicCareerUseCase(jobs),
    apply: new ApplyToJobUseCase(
      jobs,
      candidates,
      applications,
      attachments,
      storage,
      users,
      dispatcher,
      audit,
      maxBytes,
    ),
    listApplications: new ListApplicationsUseCase(applications),
    getApplication: new GetApplicationUseCase(applications),
    moveStage: new MoveApplicationStageUseCase(jobs, applications, dispatcher, audit),
    addNote: new AddApplicationNoteUseCase(applications, notes, audit),
    reject: new RejectApplicationUseCase(jobs, applications, dispatcher, audit),
    hire: new ConvertCandidateUseCase(
      jobs,
      applications,
      new HireEmployeeAdapter(prisma, new CreateEmployeeUseCase(employees, audit)),
      new ProvisionEmployeeUserAdapter(users),
      startOnboarding,
      dispatcher,
      audit,
    ),
    createTemplate: new CreateOnboardingTemplateUseCase(templates, audit),
    updateTemplate: new UpdateOnboardingTemplateUseCase(templates),
    listTemplates: new ListOnboardingTemplatesUseCase(templates),
    addTemplateItem: new AddOnboardingTemplateItemUseCase(templates),
    updateTemplateItem: new UpdateOnboardingTemplateItemUseCase(templates),
    deleteTemplateItem: new DeleteOnboardingTemplateItemUseCase(templates),
    getProcess: new GetOnboardingProcessUseCase(processes),
    completeTask: new CompleteOnboardingTaskUseCase(processes, employees),
    dashboard: new ListOnboardingDashboardUseCase(processes),
  });

  const router = Router();
  router.get("/careers", controller.listCareers);
  router.get("/careers/:slug", controller.getCareer);
  router.post("/careers/:slug/apply", upload.single("file"), controller.publicApply);

  router.get(
    "/recruitment/jobs",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_JOBS_READ),
    controller.listJobs,
  );
  router.post(
    "/recruitment/jobs",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_JOBS_WRITE),
    controller.createJob,
  );
  router.get(
    "/recruitment/jobs/:id",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_JOBS_READ),
    controller.getJob,
  );
  router.patch(
    "/recruitment/jobs/:id",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_JOBS_WRITE),
    controller.updateJob,
  );
  router.put(
    "/recruitment/jobs/:id/stages",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_JOBS_WRITE),
    controller.replaceStages,
  );
  router.get(
    "/recruitment/jobs/:id/applications",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_READ),
    controller.listApplications,
  );
  router.post(
    "/recruitment/applications",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_WRITE),
    upload.single("file"),
    controller.hrApply,
  );
  router.get(
    "/recruitment/applications/:id",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_READ),
    controller.getApplication,
  );
  router.post(
    "/recruitment/applications/:id/stage",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_WRITE),
    controller.moveStage,
  );
  router.post(
    "/recruitment/applications/:id/notes",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_WRITE),
    controller.addNote,
  );
  router.post(
    "/recruitment/applications/:id/reject",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_APPLICATIONS_WRITE),
    controller.reject,
  );
  router.post(
    "/recruitment/applications/:id/hire",
    requireAuth,
    requirePermission(PERMISSIONS.RECRUITMENT_HIRE),
    controller.hire,
  );

  router.get(
    "/onboarding/templates",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TEMPLATES_WRITE),
    controller.listTemplates,
  );
  router.post(
    "/onboarding/templates",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TEMPLATES_WRITE),
    controller.createTemplate,
  );
  router.patch(
    "/onboarding/templates/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TEMPLATES_WRITE),
    controller.updateTemplate,
  );
  router.post(
    "/onboarding/templates/:id/items",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TEMPLATES_WRITE),
    controller.addTemplateItem,
  );
  router.patch(
    "/onboarding/items/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TEMPLATES_WRITE),
    controller.updateTemplateItem,
  );
  router.delete(
    "/onboarding/items/:id",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TEMPLATES_WRITE),
    controller.deleteTemplateItem,
  );
  router.get(
    "/onboarding/dashboard",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_READ),
    controller.dashboard,
  );
  router.get("/onboarding/me", requireAuth, requirePermission(PERMISSIONS.ONBOARDING_ME), controller.getMyProcess);
  router.get(
    "/onboarding/processes/:employeeId",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_READ),
    controller.getProcess,
  );
  router.post(
    "/onboarding/tasks/:id/complete",
    requireAuth,
    requirePermission(PERMISSIONS.ONBOARDING_TASKS_COMPLETE),
    controller.completeTask,
  );

  return router;
}
