-- CreateIndex
CREATE INDEX "employees_status_fullName_idx" ON "employees"("status", "fullName");

-- CreateIndex
CREATE INDEX "leave_requests_status_createdAt_idx" ON "leave_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payroll_runs_createdAt_idx" ON "payroll_runs"("createdAt");

-- CreateIndex
CREATE INDEX "job_postings_status_createdAt_idx" ON "job_postings"("status", "createdAt");

-- CreateIndex
CREATE INDEX "applications_jobPostingId_createdAt_idx" ON "applications"("jobPostingId", "createdAt");

-- CreateIndex
CREATE INDEX "onboarding_processes_status_createdAt_idx" ON "onboarding_processes"("status", "createdAt");
