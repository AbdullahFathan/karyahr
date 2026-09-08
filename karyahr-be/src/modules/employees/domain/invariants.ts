import { ValidationError } from "../../../shared/errors/app-error";
import {
  CONTRACT_TYPES,
  EMPLOYEE_STATUSES,
  ESS_PATCH_FIELDS,
  type ContractType,
  type EmployeeStatus,
  type EssPayload,
} from "./entities/Employee";

/**
 * Validates employee status, contract type, and manager self-reference.
 */
export function assertEmployeeInvariants(input: {
  readonly id?: string;
  readonly managerId?: string | null;
  readonly status: string;
  readonly contractType: string;
}): { readonly status: EmployeeStatus; readonly contractType: ContractType } {
  if (!EMPLOYEE_STATUSES.includes(input.status as EmployeeStatus)) {
    throw new ValidationError("Invalid employee status");
  }
  if (!CONTRACT_TYPES.includes(input.contractType as ContractType)) {
    throw new ValidationError("Invalid contract type");
  }
  if (input.id && input.managerId && input.id === input.managerId) {
    throw new ValidationError("Employee cannot be their own manager");
  }
  return {
    status: input.status as EmployeeStatus,
    contractType: input.contractType as ContractType,
  };
}

/**
 * Keeps only ESS-allowed personal fields.
 */
export function parseEssPayload(input: Record<string, unknown>): EssPayload {
  const payload: {
    address?: string;
    phone?: string;
    emergencyContact?: string;
  } = {};
  for (const field of ESS_PATCH_FIELDS) {
    const value = input[field];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ValidationError(`Invalid ${field}`);
    }
    payload[field] = value.trim();
  }
  if (
    payload.address === undefined &&
    payload.phone === undefined &&
    payload.emergencyContact === undefined
  ) {
    throw new ValidationError("Change request must include at least one allowed field");
  }
  return payload;
}
