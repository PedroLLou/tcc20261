ALTER TABLE "FactAttachment"
  ADD COLUMN "content" BYTEA;

UPDATE "FactAttachment"
SET "content" = ''::bytea
WHERE "content" IS NULL;

ALTER TABLE "FactAttachment"
  ALTER COLUMN "content" SET NOT NULL,
  DROP COLUMN "storageKey";
