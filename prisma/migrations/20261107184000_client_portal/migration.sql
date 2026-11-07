CREATE TABLE "ClientPortalInvitation" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPortalInvitation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClientPortalSession" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientPortalSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientPortalInvitation_tokenHash_key" ON "ClientPortalInvitation"("tokenHash");
CREATE UNIQUE INDEX "ClientPortalSession_tokenHash_key" ON "ClientPortalSession"("tokenHash");
CREATE INDEX "ClientPortalInvitation_clientId_expiresAt_idx" ON "ClientPortalInvitation"("clientId", "expiresAt");
CREATE INDEX "ClientPortalSession_clientId_expiresAt_idx" ON "ClientPortalSession"("clientId", "expiresAt");
ALTER TABLE "ClientPortalInvitation" ADD CONSTRAINT "ClientPortalInvitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientPortalInvitation" ADD CONSTRAINT "ClientPortalInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientPortalSession" ADD CONSTRAINT "ClientPortalSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
