import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import type { IAuditLogRepository } from "../../../../shared/audit/IAuditLogRepository";
import { NotFoundError, ValidationError } from "../../../../shared/errors/app-error";
import type { IObjectStorage, StoredObject } from "../../../../shared/storage/IObjectStorage";
import type { Employee, EmployeeDocument } from "../entities/Employee";
import type { IEmployeeDocumentRepository, IEmployeeRepository } from "../repositories/IEmployeeRepository";
import {
  DeleteEmployeeDocumentUseCase,
  GetEmployeeDocumentFileUseCase,
  ListEmployeeDocumentsUseCase,
  UploadEmployeeDocumentUseCase,
} from "./EmployeeDocument.usecase";

const employee: Employee = {
  id: "e1",
  fullName: "Siti",
  nationalId: "1",
  birthDate: new Date("1995-01-01"),
  address: "Jakarta",
  phone: "081",
  emergencyContact: "082",
  employeeNumber: "EMP-1",
  departmentId: "d1",
  positionId: "p1",
  managerId: null,
  joinedAt: new Date("2024-01-01"),
  status: "ACTIVE",
  contractType: "PERMANENT",
};

class MemoryEmployees implements IEmployeeRepository {
  constructor(private readonly item: Employee | null) {}
  async create(): Promise<Employee> {
    throw new Error("unused");
  }
  async update(): Promise<Employee> {
    throw new Error("unused");
  }
  async findById(id: string): Promise<Employee | null> {
    return this.item && this.item.id === id ? this.item : null;
  }
  async findByIds(): Promise<readonly Employee[]> {
    return this.item ? [this.item] : [];
  }
  async findByNationalId(): Promise<Employee | null> {
    return null;
  }
  async findByEmployeeNumber(): Promise<Employee | null> {
    return null;
  }
  async list() {
    return { items: this.item ? [this.item] : [], total: this.item ? 1 : 0 };
  }
  async listDirectory() {
    return { items: this.item ? [this.item] : [], total: this.item ? 1 : 0 };
  }
}

class MemoryDocuments implements IEmployeeDocumentRepository {
  constructor(private rows: EmployeeDocument[] = []) {}
  async create(input: Omit<EmployeeDocument, "id"> & { readonly id: string }): Promise<EmployeeDocument> {
    this.rows.push(input);
    return input;
  }
  async findById(id: string): Promise<EmployeeDocument | null> {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  async listByEmployee(employeeId: string): Promise<readonly EmployeeDocument[]> {
    return this.rows.filter((row) => row.employeeId === employeeId);
  }
  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.id !== id);
  }
}

class MemoryStorage implements IObjectStorage {
  keys = new Set<string>();
  async putObject(key: string): Promise<void> {
    this.keys.add(key);
  }
  async getObject(key: string): Promise<StoredObject> {
    if (!this.keys.has(key)) {
      throw new Error("missing");
    }
    return { stream: Readable.from(["ok"]), contentType: "application/pdf" };
  }
  async deleteObject(key: string): Promise<void> {
    this.keys.delete(key);
  }
}

const audit: IAuditLogRepository = { append: async () => undefined };

describe("Employee documents", () => {
  test("uploads, lists, downloads, and deletes a document", async () => {
    const documents = new MemoryDocuments();
    const storage = new MemoryStorage();
    const employees = new MemoryEmployees(employee);
    const uploaded = await new UploadEmployeeDocumentUseCase(
      employees,
      documents,
      storage,
      audit,
      1024,
    ).execute({
      employeeId: "e1",
      documentId: "doc1",
      type: "KTP",
      fileName: "ktp.pdf",
      contentType: "application/pdf",
      body: Buffer.from("pdf"),
      uploadedByUserId: "u1",
    });
    expect(uploaded.objectKey).toBe("employees/e1/doc1");
    expect(await new ListEmployeeDocumentsUseCase(employees, documents).execute("e1")).toHaveLength(1);
    const file = await new GetEmployeeDocumentFileUseCase(documents, storage).execute("doc1", "e1");
    expect(file.document.fileName).toBe("ktp.pdf");
    await new DeleteEmployeeDocumentUseCase(documents, storage, audit).execute("doc1", "e1", "u1");
    expect(storage.keys.size).toBe(0);
  });

  test("rejects empty, oversized, and missing employee uploads", async () => {
    const useCase = new UploadEmployeeDocumentUseCase(
      new MemoryEmployees(employee),
      new MemoryDocuments(),
      new MemoryStorage(),
      audit,
      4,
    );
    await expect(
      useCase.execute({
        employeeId: "e1",
        documentId: "d",
        type: "KTP",
        fileName: "a",
        contentType: "application/pdf",
        body: Buffer.from(""),
        uploadedByUserId: "u1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      useCase.execute({
        employeeId: "e1",
        documentId: "d",
        type: "KTP",
        fileName: "a",
        contentType: "application/pdf",
        body: Buffer.from("12345"),
        uploadedByUserId: "u1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      new UploadEmployeeDocumentUseCase(
        new MemoryEmployees(null),
        new MemoryDocuments(),
        new MemoryStorage(),
        audit,
        1024,
      ).execute({
        employeeId: "missing",
        documentId: "d",
        type: "KTP",
        fileName: "a",
        contentType: "application/pdf",
        body: Buffer.from("x"),
        uploadedByUserId: "u1",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("throws when listing or fetching missing records", async () => {
    await expect(
      new ListEmployeeDocumentsUseCase(new MemoryEmployees(null), new MemoryDocuments()).execute("e1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new GetEmployeeDocumentFileUseCase(new MemoryDocuments(), new MemoryStorage()).execute("missing", "e1"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new DeleteEmployeeDocumentUseCase(new MemoryDocuments(), new MemoryStorage(), audit).execute(
        "missing",
        "e1",
        "u1",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("rejects a document that does not belong to the path employee", async () => {
    const documents = new MemoryDocuments();
    const storage = new MemoryStorage();
    await new UploadEmployeeDocumentUseCase(
      new MemoryEmployees(employee),
      documents,
      storage,
      audit,
      1024,
    ).execute({
      employeeId: "e1",
      documentId: "doc1",
      type: "KTP",
      fileName: "ktp.pdf",
      contentType: "application/pdf",
      body: Buffer.from("pdf"),
      uploadedByUserId: "u1",
    });
    await expect(
      new GetEmployeeDocumentFileUseCase(documents, storage).execute("doc1", "other"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      new DeleteEmployeeDocumentUseCase(documents, storage, audit).execute("doc1", "other", "u1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("rejects a disallowed content type", async () => {
    await expect(
      new UploadEmployeeDocumentUseCase(
        new MemoryEmployees(employee),
        new MemoryDocuments(),
        new MemoryStorage(),
        audit,
        1024,
      ).execute({
        employeeId: "e1",
        documentId: "d",
        type: "KTP",
        fileName: "x.html",
        contentType: "text/html",
        body: Buffer.from("<script>"),
        uploadedByUserId: "u1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
