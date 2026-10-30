CREATE TABLE "Fact" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "sessionId" INTEGER,
    "relatedUserId" INTEGER,
    "description" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactAttachment" (
    "id" SERIAL NOT NULL,
    "factId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Fact_authorId_idx" ON "Fact"("authorId");
CREATE INDEX "Fact_sessionId_idx" ON "Fact"("sessionId");
CREATE INDEX "Fact_relatedUserId_idx" ON "Fact"("relatedUserId");
CREATE INDEX "FactAttachment_factId_idx" ON "FactAttachment"("factId");

ALTER TABLE "Fact" ADD CONSTRAINT "Fact_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fact" ADD CONSTRAINT "Fact_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "FeedbackSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fact" ADD CONSTRAINT "Fact_relatedUserId_fkey"
  FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FactAttachment" ADD CONSTRAINT "FactAttachment_factId_fkey"
  FOREIGN KEY ("factId") REFERENCES "Fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT audit_enable('"Fact"');
SELECT audit_enable('"FactAttachment"');
