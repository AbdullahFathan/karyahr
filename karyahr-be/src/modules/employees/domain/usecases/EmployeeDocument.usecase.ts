import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import { assertAllowedUpload } from "../../../../shared/storage/assert-allowed-upload";
import type { DocumentType, EmployeeDocument } from "../entities/Employee";
import type {
  IEmployeeDocumentRepository,
  IEmployeeRepository,
} from "../repositories/IEmployeeRepository";

/**
 * Stores an employee document in object storage and metadata in the database.
 */
export class UploadEmployeeDocumentUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly documents: IEmployeeDocumentRepository,
    private readonly storage: IObjectStorage,
    private readonly audit: IAuditLogRepository,
    private readonly maxBytes: number,
  ) {}

  async execute(input: {
    readonly employeeId: string;
    readonly documentId: string;
    readonly type: DocumentType;
    readonly fileName: string;
    readonly contentType: string;
    readonly body: Buffer;
    readonly uploadedByUserId: string;
  }): Promise<EmployeeDocument> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    if (input.body.length === 0) {
      throw new ValidationError("File is empty");
    }
    if (input.body.length > this.maxBytes) {
      throw new ValidationError("File exceeds maximum upload size");
    }
    assertAllowedUpload(input.contentType);
    const objectKey = `employees/${input.employeeId}/${input.documentId}`;
    await this.storage.putObject(objectKey, input.body, input.contentType);
    const document = await this.documents.create({
      id: input.documentId,
      employeeId: input.employeeId,
      type: input.type,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.body.length,
      objectKey,
      uploadedByUserId: input.uploadedByUserId,
    });
    await this.audit.append({
      actorUserId: input.uploadedByUserId,
      entityType: "EmployeeDocument",
      entityId: document.id,
      action: "upload",
      metadata: { employeeId: input.employeeId, type: input.type },
    });
    return document;
  }
}

/**
 * Lists documents for an employee.
 */
export class ListEmployeeDocumentsUseCase {
  constructor(
    private readonly employees: IEmployeeRepository,
    private readonly documents: IEmployeeDocumentRepository,
  ) {}

  async execute(employeeId: string): Promise<readonly EmployeeDocument[]> {
    const employee = await this.employees.findById(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee not found");
    }
    return this.documents.listByEmployee(employeeId);
  }
}

/**
 * Loads a stored document for download.
 */
export class GetEmployeeDocumentFileUseCase {
  constructor(
    private readonly documents: IEmployeeDocumentRepository,
    private readonly storage: IObjectStorage,
  ) {}

  async execute(documentId: string, employeeId: string) {
    const document = await this.documents.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document not found");
    }
    if (document.employeeId !== employeeId) {
      throw new NotFoundError("Document not found");
    }
    const object = await this.storage.getObject(document.objectKey);
    return { document, object };
  }
}

/**
 * Deletes document metadata and the stored object.
 */
export class DeleteEmployeeDocumentUseCase {
  constructor(
    private readonly documents: IEmployeeDocumentRepository,
    private readonly storage: IObjectStorage,
    private readonly audit: IAuditLogRepository,
  ) {}

  async execute(documentId: string, employeeId: string, actorUserId: string): Promise<void> {
    const document = await this.documents.findById(documentId);
    if (!document) {
      throw new NotFoundError("Document not found");
    }
    if (document.employeeId !== employeeId) {
      throw new NotFoundError("Document not found");
    }
    await this.storage.deleteObject(document.objectKey);
    await this.documents.delete(documentId);
    await this.audit.append({
      actorUserId,
      entityType: "EmployeeDocument",
      entityId: documentId,
      action: "delete",
      metadata: { employeeId: document.employeeId },
    });
  }
}
