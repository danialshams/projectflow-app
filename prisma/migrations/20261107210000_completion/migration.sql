-- Client access, sequential approvals, notification dedupe and delivery queue.
ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE TYPE "ApprovalActorKind" AS ENUM ('TEAM','CLIENT');
CREATE TABLE "ClientPortalComment" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE, "clientId" TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE, "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ClientPortalComment_projectId_createdAt_idx" ON "ClientPortalComment"("projectId", "createdAt");
CREATE TABLE "ApprovalStep" ("id" TEXT PRIMARY KEY, "approvalId" TEXT NOT NULL REFERENCES "Approval"("id") ON DELETE CASCADE, "sequence" INTEGER NOT NULL, "kind" "ApprovalActorKind" NOT NULL DEFAULT 'TEAM', "reviewerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL, "clientId" TEXT, "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE, "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING', "decisionNote" TEXT NOT NULL DEFAULT '', "decidedAt" TIMESTAMP(3), "decidedByClientId" TEXT);
CREATE UNIQUE INDEX "ApprovalStep_approvalId_sequence_key" ON "ApprovalStep"("approvalId", "sequence");
CREATE INDEX "ApprovalStep_projectId_status_idx" ON "ApprovalStep"("projectId", "status");
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_actor_check" CHECK (("kind" = 'CLIENT' AND "clientId" IS NOT NULL AND "reviewerId" IS NULL) OR ("kind" = 'TEAM' AND "clientId" IS NULL));
CREATE TABLE "DeliveryJob" ("id" TEXT PRIMARY KEY, "uniqueKey" TEXT NOT NULL UNIQUE, "channel" TEXT NOT NULL, "destination" TEXT NOT NULL, "subject" TEXT NOT NULL, "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "claimedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "DeliveryJob_status_nextAttemptAt_idx" ON "DeliveryJob"("status", "nextAttemptAt");
