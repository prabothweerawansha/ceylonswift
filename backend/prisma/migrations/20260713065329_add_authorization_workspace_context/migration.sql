-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "selectedMembershipId" UUID;

-- CreateIndex
CREATE INDEX "Session_selectedMembershipId_idx" ON "Session"("selectedMembershipId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_selectedMembershipId_fkey" FOREIGN KEY ("selectedMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
