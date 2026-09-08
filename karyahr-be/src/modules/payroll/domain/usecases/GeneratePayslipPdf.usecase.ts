import PDFDocument from "pdfkit";
import { NotFoundError } from "../../../../shared/errors/app-error";
import type { IObjectStorage } from "../../../../shared/storage/IObjectStorage";
import type { IEmployeeRepository } from "../../../employees/domain/repositories/IEmployeeRepository";
import type { IPayrollRunRepository, IPayslipRepository } from "../repositories/IPayrollRepository";

function formatRupiah(amount: bigint): string {
  return `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function collectPdf(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
  });
}

/**
 * Renders a payslip PDF and stores it. No-ops when the object key is already set.
 */
export class GeneratePayslipPdfUseCase {
  constructor(
    private readonly payslips: IPayslipRepository,
    private readonly runs: IPayrollRunRepository,
    private readonly employees: IEmployeeRepository,
    private readonly storage: IObjectStorage,
    private readonly companyName: string,
  ) {}

  async execute(payslipId: string): Promise<string> {
    const payslip = await this.payslips.findById(payslipId);
    if (!payslip) {
      throw new NotFoundError("Payslip not found");
    }
    if (payslip.pdfObjectKey) {
      return payslip.pdfObjectKey;
    }
    const run = await this.runs.findById(payslip.payrollRunId);
    const employee = await this.employees.findById(payslip.employeeId);
    if (!run || !employee) {
      throw new NotFoundError("Payslip run or employee not found");
    }
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const done = collectPdf(doc);
    doc.fontSize(16).text(this.companyName);
    doc.moveDown(0.5);
    doc.fontSize(12).text("Slip Gaji");
    doc.fontSize(10).text(`Karyawan: ${employee.fullName} (${employee.employeeNumber})`);
    doc.text(
      `Periode: ${run.periodStart.toISOString().slice(0, 10)} – ${run.periodEnd.toISOString().slice(0, 10)}`,
    );
    doc.moveDown();
    for (const line of payslip.lines) {
      doc.text(`${line.name} (${line.code}): ${formatRupiah(line.amountRupiah)}`);
    }
    doc.moveDown();
    doc.text(`Gross: ${formatRupiah(payslip.grossRupiah)}`);
    doc.text(`Potongan statutory: ${formatRupiah(payslip.statutoryRupiah)}`);
    doc.text(`Net: ${formatRupiah(payslip.netRupiah)}`);
    doc.end();
    const buffer = await done;
    const objectKey = `payroll/payslips/${run.id}/${employee.id}.pdf`;
    await this.storage.putObject(objectKey, buffer, "application/pdf");
    await this.payslips.setPdfObjectKey(payslip.id, objectKey);
    return objectKey;
  }
}
