-- AlterTable: Add studentNumber column to User (nullable, unique)
ALTER TABLE "User" ADD COLUMN "studentNumber" VARCHAR(20);

-- CreateIndex: unique constraint on studentNumber
CREATE UNIQUE INDEX "User_studentNumber_key" ON "User"("studentNumber");

-- CreateIndex: regular index for fast lookups
CREATE INDEX "User_studentNumber_idx" ON "User"("studentNumber");
