-- CreateEnum
CREATE TYPE "IdempotencyState" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'SKIPPED');

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" UUID NOT NULL,
    "scopeHash" VARCHAR(64) NOT NULL,
    "keyHash" VARCHAR(64) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "branchId" UUID,
    "workspaceType" VARCHAR(32) NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "state" "IdempotencyState" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "failureCode" VARCHAR(100),
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJobRun" (
    "id" UUID NOT NULL,
    "jobName" VARCHAR(160) NOT NULL,
    "lockKey" BIGINT NOT NULL,
    "status" "BackgroundJobStatus" NOT NULL DEFAULT 'RUNNING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "durationMs" INTEGER,
    "failureCode" VARCHAR(100),
    "failureMessage" VARCHAR(500),
    "nextRetryAt" TIMESTAMPTZ(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BackgroundJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadLetterJob" (
    "id" UUID NOT NULL,
    "jobName" VARCHAR(160) NOT NULL,
    "jobRunId" UUID,
    "failureCode" VARCHAR(100) NOT NULL,
    "failureMessage" VARCHAR(500) NOT NULL,
    "attempts" INTEGER NOT NULL,
    "safeContext" JSONB,
    "failedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolutionNote" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DeadLetterJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdempotencyRecord_state_expiresAt_idx" ON "IdempotencyRecord"("state", "expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_userId_createdAt_idx" ON "IdempotencyRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_organizationId_branchId_createdAt_idx" ON "IdempotencyRecord"("organizationId", "branchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scopeHash_endpoint_method_keyHash_key" ON "IdempotencyRecord"("scopeHash", "endpoint", "method", "keyHash");

-- CreateIndex
CREATE INDEX "BackgroundJobRun_jobName_startedAt_idx" ON "BackgroundJobRun"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX "BackgroundJobRun_status_nextRetryAt_idx" ON "BackgroundJobRun"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "DeadLetterJob_jobName_failedAt_idx" ON "DeadLetterJob"("jobName", "failedAt");

-- CreateIndex
CREATE INDEX "DeadLetterJob_resolvedAt_failedAt_idx" ON "DeadLetterJob"("resolvedAt", "failedAt");
