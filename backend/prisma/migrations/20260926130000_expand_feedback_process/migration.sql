CREATE TYPE "FeedbackProcessStatus" AS ENUM ('DRAFT', 'PLANNED');

ALTER TABLE "FeedbackProcess"
  ADD COLUMN "objective" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "startsAt" TIMESTAMP(3),
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "criteria" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" "FeedbackProcessStatus" NOT NULL DEFAULT 'PLANNED',
  ADD COLUMN "participantId" INTEGER;

CREATE INDEX "FeedbackProcess_participantId_idx" ON "FeedbackProcess"("participantId");

ALTER TABLE "FeedbackProcess"
  ADD CONSTRAINT "FeedbackProcess_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;