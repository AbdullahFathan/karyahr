import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { ConflictError, NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import { CONTRACT_TYPES, type ContractType } from "../../../employees/domain/entities/Employee";
import type { INotificationDispatcher } from "../../../notifications/domain/ports/INotificationDispatcher";
import type { IHireEmployee } from "../ports/IHireEmployee";
import type { IProvisionEmployeeUser } from "../ports/IProvisionEmployeeUser";
import type { ApplicationDetail } from "../entities/Recruitment";
import type { IApplicationRepository, IJobPostingRepository } from "../repositories/IRecruitmentRepository";
import type { StartOnboardingProcessUseCase } from "./Onboarding.usecase";

export type HireCandidateInput = {
  readonly nationalId?: string;
  readonly birthDate: Date;
  readonly address: string;
  readonly phone?: string;
  readonly emergencyContact: string;
  readonly employeeNumber?: string;
  readonly managerId?: string | null;
  readonly joinedAt: Date;
  readonly contractType: ContractType;
};

/**
 * Converts an accepted candidate into an employee, login, and onboarding process.
 */
export class ConvertCandidateUseCase {
  constructor(
    private readonly jobs: IJobPostingRepository,
    private readonly applications: IApplicationRepository,
    private readonly hireEmployee: IHireEmployee,
    private readonly provisionUser: IProvisionEmployeeUser,
    private readonly startOnboarding: StartOnboardingProcessUseCase,
    private readonly dispatcher: INotificationDispatcher,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(
    applicationId: string,
    input: HireCandidateInput,
    actorUserId: string,
  ): Promise<ApplicationDetail> {
    if (!(CONTRACT_TYPES as readonly string[]).includes(input.contractType)) {
      throw new ValidationError("Invalid contract type");
    }
    const application = await this.applications.findById(applicationId);
    if (!application) {
      throw new NotFoundError("Application not found");
    }
    if (application.status !== "ACTIVE") {
      throw new ConflictError("Application cannot be converted");
    }
    const posting = await this.jobs.findById(application.jobPostingId);
    if (!posting) {
      throw new NotFoundError("Job posting not found");
    }
    const nationalId = input.nationalId ?? application.candidate.nationalId;
    if (!nationalId) {
      throw new ValidationError("National ID is required to hire");
    }
    const year = input.joinedAt.getUTCFullYear();
    const employeeNumber = input.employeeNumber ?? (await this.hireEmployee.nextEmployeeNumber(year));
    const employee = await this.hireEmployee.create(
      {
        fullName: application.candidate.fullName,
        nationalId,
        birthDate: input.birthDate,
        address: input.address,
        phone: input.phone ?? application.candidate.phone,
        emergencyContact: input.emergencyContact,
        employeeNumber,
        departmentId: posting.departmentId,
        positionId: posting.positionId,
        managerId: input.managerId ?? null,
        joinedAt: input.joinedAt,
        status: "PROBATION",
        contractType: input.contractType,
      },
      actorUserId,
    );
    await this.provisionUser.provision({
      email: application.candidate.email,
      employeeId: employee.id,
    });
    await this.startOnboarding.execute({
      employeeId: employee.id,
      positionId: posting.positionId,
      managerId: employee.managerId,
    });
    const hired = await this.applications.updateStatus(applicationId, {
      status: "HIRED",
      employeeId: employee.id,
    });
    await this.dispatcher.dispatch({
      type: "recruitment.decision",
      recipientEmail: application.candidate.email,
      title: `Offer accepted: ${posting.title}`,
      body: `Welcome to KaryaHR. Your employee number is ${employee.employeeNumber}. Sign in with the credentials issued at hire.`,
      entityType: "Application",
      entityId: hired.id,
    });
    await this.audit.append({
      actorUserId,
      entityType: "Application",
      entityId: hired.id,
      action: "hire",
      metadata: { employeeId: employee.id },
    });
    return hired;
  }
}
