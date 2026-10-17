-- CreateTable
CREATE TABLE "FeedbackProcess" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackProcess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackProcess_ownerId_idx" ON "FeedbackProcess"("ownerId");

-- AddForeignKey
ALTER TABLE "FeedbackProcess" ADD CONSTRAINT "FeedbackProcess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
