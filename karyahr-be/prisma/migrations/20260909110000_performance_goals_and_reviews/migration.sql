-- CreateEnum
CREATE TYPE "GoalLevel" AS ENUM ('COMPANY', 'DEPARTMENT', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PerformancePeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PerformanceCycleStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "PerformanceReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PerformanceRaterType" AS ENUM ('SELF', 'MANAGER', 'PEER');

-- CreateEnum
CREATE TYPE "PerformanceRecommendation" AS ENUM ('PROMOTION', 'DEVELOPMENT', 'PIP');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "level" "GoalLevel" NOT NULL,
    "parentGoalId" TEXT,
    "departmentId" TEXT,
    "employeeId" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_key_results" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_cycles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodType" "PerformancePeriodType" NOT NULL,
    "startsAt" DATE NOT NULL,
    "endsAt" DATE NOT NULL,
    "status" "PerformanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "finalScore" DOUBLE PRECISION,
    "recommendation" "PerformanceRecommendation",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_peer_assignments" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "peerEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_peer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_ratings" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "raterEmployeeId" TEXT NOT NULL,
    "raterType" "PerformanceRaterType" NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_parentGoalId_idx" ON "goals"("parentGoalId");

-- CreateIndex
CREATE INDEX "goals_departmentId_idx" ON "goals"("departmentId");

-- CreateIndex
CREATE INDEX "goals_employeeId_status_idx" ON "goals"("employeeId", "status");

-- CreateIndex
CREATE INDEX "goals_level_status_idx" ON "goals"("level", "status");

-- CreateIndex
CREATE INDEX "goal_key_results_goalId_idx" ON "goal_key_results"("goalId");

-- CreateIndex
CREATE INDEX "performance_cycles_status_idx" ON "performance_cycles"("status");

-- CreateIndex
CREATE INDEX "performance_cycles_startsAt_endsAt_idx" ON "performance_cycles"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "performance_reviews_cycleId_employeeId_key" ON "performance_reviews"("cycleId", "employeeId");

-- CreateIndex
CREATE INDEX "performance_reviews_employeeId_status_idx" ON "performance_reviews"("employeeId", "status");

-- CreateIndex
CREATE INDEX "performance_reviews_cycleId_status_idx" ON "performance_reviews"("cycleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "performance_peer_assignments_reviewId_peerEmployeeId_key" ON "performance_peer_assignments"("reviewId", "peerEmployeeId");

-- CreateIndex
CREATE INDEX "performance_peer_assignments_peerEmployeeId_idx" ON "performance_peer_assignments"("peerEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "performance_ratings_reviewId_raterEmployeeId_key" ON "performance_ratings"("reviewId", "raterEmployeeId");

-- CreateIndex
CREATE INDEX "performance_ratings_raterEmployeeId_idx" ON "performance_ratings"("raterEmployeeId");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_key_results" ADD CONSTRAINT "goal_key_results_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "performance_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_peer_assignments" ADD CONSTRAINT "performance_peer_assignments_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_peer_assignments" ADD CONSTRAINT "performance_peer_assignments_peerEmployeeId_fkey" FOREIGN KEY ("peerEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_ratings_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "performance_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_ratings_raterEmployeeId_fkey" FOREIGN KEY ("raterEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
