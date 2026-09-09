-- AlterTable
ALTER TABLE "employee_salary_assignments" ALTER COLUMN "amountRupiah" SET DATA TYPE TEXT USING "amountRupiah"::text;

-- AlterTable
ALTER TABLE "payslips" ALTER COLUMN "grossRupiah" SET DATA TYPE TEXT USING "grossRupiah"::text;

-- AlterTable
ALTER TABLE "payslips" ALTER COLUMN "statutoryRupiah" SET DATA TYPE TEXT USING "statutoryRupiah"::text;

-- AlterTable
ALTER TABLE "payslips" ALTER COLUMN "netRupiah" SET DATA TYPE TEXT USING "netRupiah"::text;

-- AlterTable
ALTER TABLE "payslips" ALTER COLUMN "lines" SET DATA TYPE TEXT USING "lines"::text;
