-- AlterTable
ALTER TABLE "OtpChallenge" ADD COLUMN     "requestIpHash" VARCHAR(128),
ADD COLUMN     "resendAvailableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "mfaCompletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "recentAuthenticationAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "OAuthChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "provider" "OAuthProvider" NOT NULL,
    "stateHash" VARCHAR(255) NOT NULL,
    "nonceHash" VARCHAR(255) NOT NULL,
    "pkceVerifierHash" VARCHAR(255),
    "redirectOrigin" VARCHAR(500),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "challengeHash" VARCHAR(255) NOT NULL,
    "purpose" VARCHAR(64) NOT NULL,
    "relyingPartyId" VARCHAR(255) NOT NULL,
    "origin" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthChallenge_stateHash_key" ON "OAuthChallenge"("stateHash");

-- CreateIndex
CREATE INDEX "OAuthChallenge_provider_expiresAt_consumedAt_idx" ON "OAuthChallenge"("provider", "expiresAt", "consumedAt");

-- CreateIndex
CREATE INDEX "OAuthChallenge_userId_createdAt_idx" ON "OAuthChallenge"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnChallenge_challengeHash_key" ON "WebAuthnChallenge"("challengeHash");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_userId_purpose_expiresAt_idx" ON "WebAuthnChallenge"("userId", "purpose", "expiresAt");

-- AddForeignKey
ALTER TABLE "OAuthChallenge" ADD CONSTRAINT "OAuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnChallenge" ADD CONSTRAINT "WebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
