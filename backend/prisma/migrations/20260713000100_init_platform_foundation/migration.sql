-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WEB', 'ANDROID', 'IOS', 'DESKTOP', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'COMPROMISED');

-- CreateEnum
CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL', 'PASSKEY');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('PENDING', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('DELIVERY_COMPANY', 'PARTNER', 'TUITION_PARTNER', 'PLATFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'ORGANIZATION', 'BRANCH');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('PENDING', 'AVAILABLE', 'ASSIGNED', 'OFF_DUTY', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('DRAFT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'AWAITING_PICKUP', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_HUB', 'IN_TRANSIT', 'RECEIVED_AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PackageAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrackingEventType" AS ENUM ('CREATED', 'CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'HUB_RECEIVED', 'HUB_DEPARTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'DELIVERY_FAILED', 'RETURN_REQUESTED', 'RETURNED', 'CANCELLED', 'NOTE');

-- CreateEnum
CREATE TYPE "TrackingVisibility" AS ENUM ('PUBLIC', 'CUSTOMER', 'WORKFORCE', 'INTERNAL');

-- CreateEnum
CREATE TYPE "CustomerRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HubStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PricingRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('PREPAID', 'COD', 'INVOICE');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'PICKUP', 'DELIVERY', 'BILLING', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "normalizedEmail" VARCHAR(320),
    "normalizedPhone" VARCHAR(32),
    "passwordHash" TEXT,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "phoneVerifiedAt" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "preferredLanguage" VARCHAR(16) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Colombo',
    "avatarUrl" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "customerNumber" VARCHAR(64) NOT NULL,
    "serviceTier" VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    "defaultOrganizationId" UUID,
    "billingPreferences" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "employeeNumber" VARCHAR(64) NOT NULL,
    "jobTitle" VARCHAR(160) NOT NULL,
    "employeeStatus" "EmployeeStatus" NOT NULL DEFAULT 'PENDING',
    "primaryBranchId" UUID,
    "hiredAt" TIMESTAMPTZ(3),
    "terminatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "riderStatus" "RiderStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleType" VARCHAR(64),
    "vehicleIdentifier" VARCHAR(64),
    "licenseReference" VARCHAR(128),
    "capacityKg" DECIMAL(10,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "partnerOrganizationId" UUID NOT NULL,
    "partnerReference" VARCHAR(128),
    "externalReference" VARCHAR(128),
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "countryCode" CHAR(2) NOT NULL DEFAULT 'LK',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Colombo',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "parentBranchId" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Colombo',
    "addressData" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "defaultBranchId" UUID,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMPTZ(3),
    "endsAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "scope" "RoleScope" NOT NULL,
    "systemManaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" INTEGER NOT NULL DEFAULT 0,
    "requiresStepUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "organizationId" UUID,
    "branchId" UUID,
    "grantedById" UUID,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "constraints" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceId" UUID,
    "selectedOrganizationId" UUID,
    "selectedBranchId" UUID,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "authenticationStrength" INTEGER NOT NULL DEFAULT 1,
    "ipAddressHash" VARCHAR(128),
    "userAgentSummary" VARCHAR(512),
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revocationReason" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "familyId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "replacedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "fingerprintHash" VARCHAR(255),
    "displayName" VARCHAR(160),
    "platform" VARCHAR(80),
    "trustedAt" TIMESTAMPTZ(3),
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "identityHash" VARCHAR(255) NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "failureCode" VARCHAR(100),
    "ipAddressHash" VARCHAR(128),
    "deviceContext" JSONB,
    "requestId" VARCHAR(128) NOT NULL,
    "attemptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "purpose" VARCHAR(64) NOT NULL,
    "channel" VARCHAR(32) NOT NULL,
    "destinationHash" VARCHAR(255) NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerSubject" VARCHAR(255) NOT NULL,
    "providerEmail" VARCHAR(320),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasskeyCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "relyingPartyId" VARCHAR(255) NOT NULL,
    "deviceLabel" VARCHAR(160),
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfaMethod" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "MfaType" NOT NULL,
    "label" VARCHAR(160),
    "encryptedMetadata" BYTEA,
    "verifiedAt" TIMESTAMPTZ(3),
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MfaMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mfaMethodId" UUID,
    "codeHash" VARCHAR(255) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "invitedById" UUID NOT NULL,
    "acceptedById" UUID,
    "destinationHash" VARCHAR(255) NOT NULL,
    "normalizedDestination" VARCHAR(320) NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "intendedRoleKeys" TEXT[],
    "jobTitle" VARCHAR(160),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "organizationId" UUID,
    "type" "AddressType" NOT NULL DEFAULT 'OTHER',
    "label" VARCHAR(100),
    "line1" VARCHAR(255) NOT NULL,
    "line2" VARCHAR(255),
    "locality" VARCHAR(160) NOT NULL,
    "district" VARCHAR(160),
    "postalCode" VARCHAR(32),
    "countryCode" CHAR(2) NOT NULL DEFAULT 'LK',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hub" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" "HubStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Colombo',
    "addressData" JSONB,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Hub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID,
    "originBranchId" UUID,
    "destinationBranchId" UUID,
    "originHubId" UUID,
    "destinationHubId" UUID,
    "originAddressId" UUID,
    "destinationAddressId" UUID,
    "trackingCode" VARCHAR(64) NOT NULL,
    "legacyId" VARCHAR(100),
    "recipientName" VARCHAR(160) NOT NULL,
    "recipientPhone" VARCHAR(32),
    "weightKg" DECIMAL(10,3) NOT NULL,
    "serviceLevel" VARCHAR(64) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "codAmount" DECIMAL(12,2),
    "quotedAmount" DECIMAL(12,2) NOT NULL,
    "chargedAmount" DECIMAL(12,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'LKR',
    "status" "PackageStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmedAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageAssignment" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "riderId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "assignedById" UUID,
    "status" "PackageAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PackageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "hubId" UUID,
    "actorId" UUID,
    "type" "TrackingEventType" NOT NULL,
    "visibility" "TrackingVisibility" NOT NULL DEFAULT 'PUBLIC',
    "publicMessage" TEXT,
    "internalDetails" JSONB,
    "eventAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "customerId" UUID NOT NULL,
    "pickupAddressId" UUID NOT NULL,
    "deliveryAddressId" UUID NOT NULL,
    "resultingPackageId" UUID,
    "requestCode" VARCHAR(64) NOT NULL,
    "status" "CustomerRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "packageDetails" JSONB NOT NULL,
    "quotedAmount" DECIMAL(12,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'LKR',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "key" VARCHAR(100) NOT NULL,
    "serviceLevel" VARCHAR(64) NOT NULL,
    "status" "PricingRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'LKR',
    "ruleDefinition" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "effectiveUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "actorId" UUID,
    "type" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "resourceType" VARCHAR(100),
    "resourceId" UUID,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "branchId" UUID,
    "actorId" UUID,
    "sessionId" UUID,
    "action" VARCHAR(160) NOT NULL,
    "resourceType" VARCHAR(100),
    "resourceId" UUID,
    "outcome" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(128) NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "requestedById" UUID NOT NULL,
    "reviewedById" UUID,
    "type" VARCHAR(100) NOT NULL,
    "targetResourceType" VARCHAR(100) NOT NULL,
    "targetResourceId" UUID NOT NULL,
    "requestedAction" VARCHAR(160) NOT NULL,
    "requiredPermission" VARCHAR(160) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestReason" TEXT,
    "decisionReason" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_normalizedEmail_key" ON "User"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "User_normalizedPhone_key" ON "User"("normalizedPhone");

-- CreateIndex
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

-- CreateIndex
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_customerNumber_key" ON "CustomerProfile"("customerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_employeeNumber_key" ON "EmployeeProfile"("employeeNumber");

-- CreateIndex
CREATE INDEX "EmployeeProfile_primaryBranchId_employeeStatus_idx" ON "EmployeeProfile"("primaryBranchId", "employeeStatus");

-- CreateIndex
CREATE UNIQUE INDEX "RiderProfile_userId_key" ON "RiderProfile"("userId");

-- CreateIndex
CREATE INDEX "RiderProfile_riderStatus_idx" ON "RiderProfile"("riderStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_userId_key" ON "PartnerProfile"("userId");

-- CreateIndex
CREATE INDEX "PartnerProfile_partnerOrganizationId_status_idx" ON "PartnerProfile"("partnerOrganizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_type_status_idx" ON "Organization"("type", "status");

-- CreateIndex
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- CreateIndex
CREATE INDEX "Branch_organizationId_status_idx" ON "Branch"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Branch_parentBranchId_idx" ON "Branch"("parentBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_organizationId_code_key" ON "Branch"("organizationId", "code");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_status_idx" ON "OrganizationMembership"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_status_idx" ON "OrganizationMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "OrganizationMembership_defaultBranchId_idx" ON "OrganizationMembership"("defaultBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Role_key_scope_idx" ON "Role"("key", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_key_key" ON "Role"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_riskLevel_idx" ON "Permission"("riskLevel");

-- CreateIndex
CREATE INDEX "UserRole_userId_organizationId_branchId_revokedAt_idx" ON "UserRole"("userId", "organizationId", "branchId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserRole_roleId_organizationId_idx" ON "UserRole"("roleId", "organizationId");

-- CreateIndex
CREATE INDEX "UserRole_validUntil_idx" ON "UserRole"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_organizationId_branchId_key" ON "UserRole"("userId", "roleId", "organizationId", "branchId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "Session_userId_status_expiresAt_idx" ON "Session"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_deviceId_idx" ON "Session"("deviceId");

-- CreateIndex
CREATE INDEX "Session_selectedOrganizationId_selectedBranchId_idx" ON "Session"("selectedOrganizationId", "selectedBranchId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");

-- CreateIndex
CREATE INDEX "RefreshToken_sessionId_expiresAt_revokedAt_idx" ON "RefreshToken"("sessionId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_consumedAt_idx" ON "RefreshToken"("familyId", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_familyId_sequence_key" ON "RefreshToken"("familyId", "sequence");

-- CreateIndex
CREATE INDEX "UserDevice_userId_revokedAt_idx" ON "UserDevice"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserDevice_fingerprintHash_idx" ON "UserDevice"("fingerprintHash");

-- CreateIndex
CREATE INDEX "LoginAttempt_identityHash_attemptedAt_idx" ON "LoginAttempt"("identityHash", "attemptedAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_attemptedAt_idx" ON "LoginAttempt"("userId", "attemptedAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddressHash_attemptedAt_idx" ON "LoginAttempt"("ipAddressHash", "attemptedAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_destinationHash_purpose_expiresAt_idx" ON "OtpChallenge"("destinationHash", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_userId_expiresAt_idx" ON "OtpChallenge"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_provider_idx" ON "OAuthAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerSubject_key" ON "OAuthAccount"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "PasskeyCredential_credentialId_key" ON "PasskeyCredential"("credentialId");

-- CreateIndex
CREATE INDEX "PasskeyCredential_userId_revokedAt_idx" ON "PasskeyCredential"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "MfaMethod_userId_type_revokedAt_idx" ON "MfaMethod"("userId", "type", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCode_codeHash_key" ON "RecoveryCode"("codeHash");

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_usedAt_revokedAt_idx" ON "RecoveryCode"("userId", "usedAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_branchId_status_idx" ON "Invitation"("organizationId", "branchId", "status");

-- CreateIndex
CREATE INDEX "Invitation_destinationHash_status_expiresAt_idx" ON "Invitation"("destinationHash", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Address_userId_deletedAt_idx" ON "Address"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "Address_organizationId_deletedAt_idx" ON "Address"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Hub_branchId_status_idx" ON "Hub"("branchId", "status");

-- CreateIndex
CREATE INDEX "Hub_deletedAt_idx" ON "Hub"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hub_organizationId_code_key" ON "Hub"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Package_trackingCode_key" ON "Package"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Package_legacyId_key" ON "Package"("legacyId");

-- CreateIndex
CREATE INDEX "Package_organizationId_status_createdAt_idx" ON "Package"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Package_customerId_createdAt_idx" ON "Package"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Package_originBranchId_status_idx" ON "Package"("originBranchId", "status");

-- CreateIndex
CREATE INDEX "Package_destinationBranchId_status_idx" ON "Package"("destinationBranchId", "status");

-- CreateIndex
CREATE INDEX "Package_deletedAt_idx" ON "Package"("deletedAt");

-- CreateIndex
CREATE INDEX "PackageAssignment_packageId_status_idx" ON "PackageAssignment"("packageId", "status");

-- CreateIndex
CREATE INDEX "PackageAssignment_riderId_status_assignedAt_idx" ON "PackageAssignment"("riderId", "status", "assignedAt");

-- CreateIndex
CREATE INDEX "PackageAssignment_branchId_status_idx" ON "PackageAssignment"("branchId", "status");

-- CreateIndex
CREATE INDEX "TrackingEvent_packageId_eventAt_idx" ON "TrackingEvent"("packageId", "eventAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_hubId_eventAt_idx" ON "TrackingEvent"("hubId", "eventAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingEvent_packageId_sequence_key" ON "TrackingEvent"("packageId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_resultingPackageId_key" ON "CustomerRequest"("resultingPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_requestCode_key" ON "CustomerRequest"("requestCode");

-- CreateIndex
CREATE INDEX "CustomerRequest_organizationId_branchId_status_createdAt_idx" ON "CustomerRequest"("organizationId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerRequest_customerId_createdAt_idx" ON "CustomerRequest"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "PricingRule_organizationId_branchId_serviceLevel_status_eff_idx" ON "PricingRule"("organizationId", "branchId", "serviceLevel", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_organizationId_branchId_key_effectiveFrom_key" ON "PricingRule"("organizationId", "branchId", "key", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Activity_organizationId_occurredAt_idx" ON "Activity"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_branchId_occurredAt_idx" ON "Activity"("branchId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_resourceType_resourceId_idx" ON "Activity"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_occurredAt_idx" ON "AuditLog"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_occurredAt_idx" ON "AuditLog"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_organizationId_branchId_status_createdAt_idx" ON "ApprovalRequest"("organizationId", "branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_targetResourceType_targetResourceId_idx" ON "ApprovalRequest"("targetResourceType", "targetResourceId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedById_status_idx" ON "ApprovalRequest"("requestedById", "status");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_defaultOrganizationId_fkey" FOREIGN KEY ("defaultOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_primaryBranchId_fkey" FOREIGN KEY ("primaryBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_partnerOrganizationId_fkey" FOREIGN KEY ("partnerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_parentBranchId_fkey" FOREIGN KEY ("parentBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_defaultBranchId_fkey" FOREIGN KEY ("defaultBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "UserDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_selectedOrganizationId_fkey" FOREIGN KEY ("selectedOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_selectedBranchId_fkey" FOREIGN KEY ("selectedBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasskeyCredential" ADD CONSTRAINT "PasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfaMethod" ADD CONSTRAINT "MfaMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_mfaMethodId_fkey" FOREIGN KEY ("mfaMethodId") REFERENCES "MfaMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_originBranchId_fkey" FOREIGN KEY ("originBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_destinationBranchId_fkey" FOREIGN KEY ("destinationBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_originHubId_fkey" FOREIGN KEY ("originHubId") REFERENCES "Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_destinationHubId_fkey" FOREIGN KEY ("destinationHubId") REFERENCES "Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_originAddressId_fkey" FOREIGN KEY ("originAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_destinationAddressId_fkey" FOREIGN KEY ("destinationAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAssignment" ADD CONSTRAINT "PackageAssignment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAssignment" ADD CONSTRAINT "PackageAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAssignment" ADD CONSTRAINT "PackageAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAssignment" ADD CONSTRAINT "PackageAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "Hub"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_pickupAddressId_fkey" FOREIGN KEY ("pickupAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_resultingPackageId_fkey" FOREIGN KEY ("resultingPackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
