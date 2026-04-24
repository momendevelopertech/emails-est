CREATE TYPE "HierarchyReviewTargetRole" AS ENUM ('HEAD', 'SENIOR');

CREATE TYPE "HierarchyNominationRole" AS ENUM ('ROAMING', 'SENIOR');

CREATE TABLE "HierarchyReviewLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "cycleId" TEXT,
    "recipientId" TEXT NOT NULL,
    "role" "HierarchyReviewTargetRole" NOT NULL,
    "recipientName" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HierarchyReviewLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HierarchyReviewEntry" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "targetRecipientId" TEXT NOT NULL,
    "targetRecipientName" TEXT NOT NULL,
    "targetRole" TEXT,
    "targetRoom" TEXT,
    "rating" INTEGER,
    "comment" TEXT,
    "nominationRole" "HierarchyNominationRole",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HierarchyReviewEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HierarchyReviewLink_token_key" ON "HierarchyReviewLink"("token");
CREATE UNIQUE INDEX "HierarchyReviewLink_scopeKey_recipientId_role_key" ON "HierarchyReviewLink"("scopeKey", "recipientId", "role");
CREATE INDEX "HierarchyReviewLink_scopeKey_role_idx" ON "HierarchyReviewLink"("scopeKey", "role");
CREATE INDEX "HierarchyReviewLink_scopeKey_building_role_idx" ON "HierarchyReviewLink"("scopeKey", "building", "role");
CREATE UNIQUE INDEX "HierarchyReviewEntry_linkId_targetRecipientId_key" ON "HierarchyReviewEntry"("linkId", "targetRecipientId");
CREATE INDEX "HierarchyReviewEntry_targetRecipientId_idx" ON "HierarchyReviewEntry"("targetRecipientId");

ALTER TABLE "HierarchyReviewLink"
ADD CONSTRAINT "HierarchyReviewLink_cycleId_fkey"
FOREIGN KEY ("cycleId") REFERENCES "RecipientCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HierarchyReviewLink"
ADD CONSTRAINT "HierarchyReviewLink_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HierarchyReviewEntry"
ADD CONSTRAINT "HierarchyReviewEntry_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "HierarchyReviewLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
