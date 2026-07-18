CREATE TYPE "FeaturePolicyState" AS ENUM (
  'ENABLED',
  'COMING_SOON',
  'DISABLED',
  'MAINTENANCE'
);

CREATE TYPE "FeaturePolicyScope" AS ENUM (
  'GLOBAL',
  'ORGANIZATION',
  'BRANCH',
  'USER'
);

CREATE TABLE "FeaturePolicy" (
  "id" UUID NOT NULL,
  "featureKey" VARCHAR(100) NOT NULL,
  "scopeType" "FeaturePolicyScope" NOT NULL DEFAULT 'GLOBAL',
  "scopeId" VARCHAR(100) NOT NULL DEFAULT 'GLOBAL',
  "state" "FeaturePolicyState" NOT NULL,
  "configuration" JSONB,
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "reason" VARCHAR(500) NOT NULL,
  "updatedById" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "FeaturePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeaturePolicy_featureKey_scopeType_scopeId_key"
  ON "FeaturePolicy"("featureKey", "scopeType", "scopeId");

CREATE INDEX "FeaturePolicy_scopeType_scopeId_effectiveFrom_effectiveUntil_idx"
  ON "FeaturePolicy"("scopeType", "scopeId", "effectiveFrom", "effectiveUntil");

CREATE INDEX "FeaturePolicy_featureKey_state_idx"
  ON "FeaturePolicy"("featureKey", "state");

ALTER TABLE "FeaturePolicy"
  ADD CONSTRAINT "FeaturePolicy_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeaturePolicy"
  ADD CONSTRAINT "FeaturePolicy_effective_window_check"
  CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom");

ALTER TABLE "FeaturePolicy"
  ADD CONSTRAINT "FeaturePolicy_scope_id_check"
  CHECK (
    ("scopeType" = 'GLOBAL' AND "scopeId" = 'GLOBAL')
    OR
    ("scopeType" <> 'GLOBAL' AND "scopeId" <> 'GLOBAL')
  );

ALTER TABLE "FeaturePolicy"
  ADD CONSTRAINT "FeaturePolicy_version_check"
  CHECK ("version" > 0);
