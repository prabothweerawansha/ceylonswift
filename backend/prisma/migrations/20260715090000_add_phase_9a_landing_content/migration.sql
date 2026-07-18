-- Phase 9A is additive: published landing content, constrained campaigns/media,
-- verified reviews, and server-authoritative public metric snapshots.
CREATE TYPE "SiteRevisionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "SiteCardType" AS ENUM ('DATA_BOUND', 'PROMOTION', 'STATIC_FEATURE', 'REVIEW_SUMMARY', 'PERFORMANCE_METRIC', 'TRACKING_PREVIEW');
CREATE TYPE "MediaApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PENDING_MODERATION', 'APPROVED', 'REJECTED', 'HIDDEN', 'ARCHIVED');
CREATE TYPE "ReviewModerationAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'HIDDEN', 'ESCALATED');

ALTER TABLE "Package" ADD COLUMN "promisedDeliveryAt" TIMESTAMPTZ(3);

CREATE TABLE "SiteContentRevision" (
  "id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "SiteRevisionStatus" NOT NULL DEFAULT 'DRAFT',
  "payload" JSONB NOT NULL,
  "changeSummary" VARCHAR(500),
  "createdById" UUID NOT NULL,
  "reviewedById" UUID,
  "submittedAt" TIMESTAMPTZ(3),
  "reviewedAt" TIMESTAMPTZ(3),
  "publishedAt" TIMESTAMPTZ(3),
  "scheduledFor" TIMESTAMPTZ(3),
  "rejectionReason" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteContentRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteCampaign" (
  "id" UUID NOT NULL,
  "stableKey" VARCHAR(100) NOT NULL,
  "cardType" "SiteCardType" NOT NULL DEFAULT 'PROMOTION',
  "title" VARCHAR(120) NOT NULL,
  "label" VARCHAR(48),
  "body" VARCHAR(240) NOT NULL,
  "ctaLabel" VARCHAR(48),
  "actionKey" VARCHAR(64),
  "priority" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMPTZ(3) NOT NULL,
  "endsAt" TIMESTAMPTZ(3),
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdById" UUID NOT NULL,
  "approvedById" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SiteCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
  "id" UUID NOT NULL,
  "originalFilename" VARCHAR(255) NOT NULL,
  "safeFilename" VARCHAR(255) NOT NULL,
  "mimeType" VARCHAR(64) NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "altText" VARCHAR(240),
  "decorative" BOOLEAN NOT NULL DEFAULT false,
  "approvalStatus" "MediaApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "data" BYTEA NOT NULL,
  "uploadedById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerReview" (
  "id" UUID NOT NULL,
  "packageId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" VARCHAR(120),
  "body" VARCHAR(1500) NOT NULL,
  "tags" TEXT[] NOT NULL,
  "publicConsent" BOOLEAN NOT NULL DEFAULT false,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_MODERATION',
  "moderationReason" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "moderatedAt" TIMESTAMPTZ(3),
  CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewModerationEvent" (
  "id" UUID NOT NULL,
  "reviewId" UUID NOT NULL,
  "moderatorId" UUID,
  "action" "ReviewModerationAction" NOT NULL,
  "reason" VARCHAR(500),
  "snapshot" JSONB NOT NULL,
  "requestId" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicMetricSnapshot" (
  "id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "value" DECIMAL(12,4),
  "sampleSize" INTEGER NOT NULL,
  "periodStart" TIMESTAMPTZ(3) NOT NULL,
  "periodEnd" TIMESTAMPTZ(3) NOT NULL,
  "methodology" VARCHAR(500) NOT NULL,
  "calculatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteContentRevision_version_key" ON "SiteContentRevision"("version");
CREATE INDEX "SiteContentRevision_status_publishedAt_idx" ON "SiteContentRevision"("status", "publishedAt");
CREATE INDEX "SiteContentRevision_scheduledFor_status_idx" ON "SiteContentRevision"("scheduledFor", "status");
CREATE UNIQUE INDEX "SiteCampaign_stableKey_key" ON "SiteCampaign"("stableKey");
CREATE INDEX "SiteCampaign_published_approved_startsAt_endsAt_priority_idx" ON "SiteCampaign"("published", "approved", "startsAt", "endsAt", "priority");
CREATE UNIQUE INDEX "MediaAsset_safeFilename_key" ON "MediaAsset"("safeFilename");
CREATE INDEX "MediaAsset_approvalStatus_createdAt_idx" ON "MediaAsset"("approvalStatus", "createdAt");
CREATE UNIQUE INDEX "CustomerReview_packageId_key" ON "CustomerReview"("packageId");
CREATE INDEX "CustomerReview_status_publicConsent_createdAt_idx" ON "CustomerReview"("status", "publicConsent", "createdAt");
CREATE INDEX "CustomerReview_customerId_createdAt_idx" ON "CustomerReview"("customerId", "createdAt");
CREATE INDEX "ReviewModerationEvent_reviewId_createdAt_idx" ON "ReviewModerationEvent"("reviewId", "createdAt");
CREATE INDEX "ReviewModerationEvent_moderatorId_createdAt_idx" ON "ReviewModerationEvent"("moderatorId", "createdAt");
CREATE INDEX "PublicMetricSnapshot_key_calculatedAt_idx" ON "PublicMetricSnapshot"("key", "calculatedAt");

ALTER TABLE "SiteContentRevision" ADD CONSTRAINT "SiteContentRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteContentRevision" ADD CONSTRAINT "SiteContentRevision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SiteCampaign" ADD CONSTRAINT "SiteCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SiteCampaign" ADD CONSTRAINT "SiteCampaign_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewModerationEvent" ADD CONSTRAINT "ReviewModerationEvent_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "CustomerReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewModerationEvent" ADD CONSTRAINT "ReviewModerationEvent_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
