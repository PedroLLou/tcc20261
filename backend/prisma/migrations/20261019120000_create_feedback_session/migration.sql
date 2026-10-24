CREATE TABLE "FeedbackSession" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedbackSession_processId_idx" ON "FeedbackSession"("processId");

ALTER TABLE "FeedbackSession" ADD CONSTRAINT "FeedbackSession_processId_fkey" FOREIGN KEY ("processId") REFERENCES "FeedbackProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

SELECT audit_enable('"FeedbackSession"');
