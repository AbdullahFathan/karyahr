import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { attemptLogin, login, loginAsAdmin } from "./harness/auth";
import {
  createEmployeeViaApi,
  createStaffAccount,
  loadOrgSlice,
  type OrgSlice,
} from "./harness/fixtures";
import { anonymousClient, CookieClient, type ApiErrorBody } from "./harness/http";
import { startE2eServer, stopE2eServer } from "./harness/server";

const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

type EmployeeJson = {
  readonly id: string;
  readonly fullName: string;
  readonly employeeNumber: string;
  readonly departmentId: string;
  readonly positionId: string;
  readonly status: string;
  readonly address: string;
  readonly phone: string;
  readonly emergencyContact: string;
};

type ChangeRequestJson = {
  readonly id: string;
  readonly status: string;
  readonly payload: { readonly phone?: string; readonly address?: string };
};

type DocumentJson = {
  readonly id: string;
  readonly employeeId: string;
  readonly type: string;
  readonly fileName: string;
};

let baseUrl: string;
let admin: CookieClient;
let org: OrgSlice;

beforeAll(async () => {
  const server = await startE2eServer();
  baseUrl = server.baseUrl;
  admin = await loginAsAdmin(baseUrl);
  org = await loadOrgSlice();
});

afterAll(async () => {
  await stopE2eServer();
});

describe("employees E2E", () => {
  test("rejects unauthenticated list", async () => {
    const response = await anonymousClient(baseUrl).request("/employees");
    expect(response.status).toBe(401);
    const body = (await response.json()) as ApiErrorBody;
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("rejects create without employees:write", async () => {
    const staff = await createStaffAccount(admin, org);
    const ess = new CookieClient(baseUrl);
    await login(ess, staff.email, staff.password);
    const response = await ess.request("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Forbidden",
        nationalId: "9999999999999999",
        birthDate: "1990-01-01",
        address: "x",
        phone: "1",
        emergencyContact: "2",
        employeeNumber: "FORBIDDEN-1",
        departmentId: org.departmentId,
        positionId: org.positionId,
        joinedAt: "2024-01-01",
        status: "ACTIVE",
        contractType: "PERMANENT",
      }),
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as ApiErrorBody;
    expect(body.error).toBe("FORBIDDEN");
  });

  test("creates, reads, patches, and lists with filters", async () => {
    const created = await createEmployeeViaApi(admin, org, {
      fullName: "E2E Searchable UniqueName",
    });
    expect(created.status).toBe("ACTIVE");

    const getRes = await admin.request(`/employees/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as EmployeeJson;
    expect(fetched.employeeNumber).toBe(created.employeeNumber);

    const patchRes = await admin.request(`/employees/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "0899999999" }),
    });
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as EmployeeJson;
    expect(patched.phone).toBe("0899999999");

    const listRes = await admin.request(
      `/employees?search=Searchable UniqueName&status=ACTIVE&departmentId=${org.departmentId}&page=1&pageSize=5`,
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as {
      data: readonly EmployeeJson[];
      meta: { page: number; pageSize: number; total: number };
    };
    expect(list.meta.page).toBe(1);
    expect(list.meta.pageSize).toBe(5);
    expect(list.data.some((item) => item.id === created.id)).toBe(true);
  });

  test("ESS profile and change-request approve then reject", async () => {
    const staff = await createStaffAccount(admin, org);
    const ess = new CookieClient(baseUrl);
    await login(ess, staff.email, staff.password);

    const meRes = await ess.request("/employees/me");
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as EmployeeJson;
    expect(me.id).toBe(staff.employee.id);

    const createReq = await ess.request("/employees/me/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "0833333333" }),
    });
    expect(createReq.status).toBe(201);
    const pending = (await createReq.json()) as ChangeRequestJson;
    expect(pending.status).toBe("PENDING");

    const mine = await ess.request("/employees/me/change-requests");
    expect(mine.status).toBe(200);
    const mineBody = (await mine.json()) as { data: readonly ChangeRequestJson[] };
    expect(mineBody.data.some((item) => item.id === pending.id)).toBe(true);

    const approveRes = await admin.request(`/employees/change-requests/${pending.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote: "ok" }),
    });
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as ChangeRequestJson;
    expect(approved.status).toBe("APPROVED");

    const after = (await (await ess.request("/employees/me")).json()) as EmployeeJson;
    expect(after.phone).toBe("0833333333");

    const rejectCreate = await ess.request("/employees/me/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: "Should not apply" }),
    });
    expect(rejectCreate.status).toBe(201);
    const toReject = (await rejectCreate.json()) as ChangeRequestJson;
    const rejectRes = await admin.request(`/employees/change-requests/${toReject.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote: "no" }),
    });
    expect(rejectRes.status).toBe(200);
    const rejected = (await rejectRes.json()) as ChangeRequestJson;
    expect(rejected.status).toBe("REJECTED");
    const still = (await (await ess.request("/employees/me")).json()) as EmployeeJson;
    expect(still.address).toBe(staff.employee.address);
  });

  test("records and lists mutations", async () => {
    const employee = await createEmployeeViaApi(admin, org);
    const createRes = await admin.request(`/employees/${employee.id}/mutations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toDepartmentId: org.otherDepartmentId,
        toPositionId: org.otherPositionId,
        effectiveAt: "2026-02-01",
        reason: "E2E transfer",
      }),
    });
    expect(createRes.status).toBe(201);
    const listRes = await admin.request(`/employees/${employee.id}/mutations`);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as { data: readonly { reason: string }[] };
    expect(list.data.some((item) => item.reason === "E2E transfer")).toBe(true);
    const moved = (await (await admin.request(`/employees/${employee.id}`)).json()) as EmployeeJson;
    expect(moved.departmentId).toBe(org.otherDepartmentId);
    expect(moved.positionId).toBe(org.otherPositionId);
  });

  test("uploads, lists, downloads, and deletes documents; mismatches 404", async () => {
    const owner = await createEmployeeViaApi(admin, org);
    const other = await createEmployeeViaApi(admin, org);
    const form = new FormData();
    form.set("type", "KTP");
    form.set("file", new Blob([PNG_BYTES], { type: "image/png" }), "ktp.png");
    const uploadRes = await admin.request(`/employees/${owner.id}/documents`, {
      method: "POST",
      body: form,
    });
    expect(uploadRes.status).toBe(201);
    const document = (await uploadRes.json()) as DocumentJson;
    expect(document.employeeId).toBe(owner.id);
    expect(document.type).toBe("KTP");

    const listRes = await admin.request(`/employees/${owner.id}/documents`);
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as { data: readonly DocumentJson[] };
    expect(listed.data.some((item) => item.id === document.id)).toBe(true);

    const download = await admin.request(`/employees/${owner.id}/documents/${document.id}/file`);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toContain("image/png");
    const bytes = new Uint8Array(await download.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(0);

    const mismatch = await admin.request(`/employees/${other.id}/documents/${document.id}/file`);
    expect(mismatch.status).toBe(404);
    const mismatchBody = (await mismatch.json()) as ApiErrorBody;
    expect(mismatchBody.error).toBe("NOT_FOUND");

    const deleteMismatch = await admin.request(
      `/employees/${other.id}/documents/${document.id}`,
      { method: "DELETE" },
    );
    expect(deleteMismatch.status).toBe(404);

    const deleted = await admin.request(`/employees/${owner.id}/documents/${document.id}`, {
      method: "DELETE",
    });
    expect(deleted.status).toBe(204);
  });

  test("offboard deactivates login; self-offboard and repeat offboard conflict", async () => {
    const staff = await createStaffAccount(admin, org);
    const ess = new CookieClient(baseUrl);
    await login(ess, staff.email, staff.password);

    const meRes = await admin.request("/auth/me");
    expect(meRes.status).toBe(200);
    const me = (await meRes.json()) as { employee: { id: string } };
    const selfOffboard = await admin.request(`/employees/${me.employee.id}/offboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "self" }),
    });
    expect(selfOffboard.status).toBe(409);

    const offboardRes = await admin.request(`/employees/${staff.employee.id}/offboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "E2E exit" }),
    });
    expect(offboardRes.status).toBe(200);
    const offboarded = (await offboardRes.json()) as EmployeeJson;
    expect(offboarded.status).toBe("INACTIVE");

    const loginAfter = await attemptLogin(new CookieClient(baseUrl), staff.email, staff.password);
    expect(loginAfter.status).toBe(401);

    const again = await admin.request(`/employees/${staff.employee.id}/offboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(again.status).toBe(409);
  });
});
