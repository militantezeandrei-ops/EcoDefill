-- DropForeignKey
ALTER TABLE "RecyclingLog" DROP CONSTRAINT "RecyclingLog_userId_fkey";

-- AlterTable
ALTER TABLE "RecyclingLog" ADD COLUMN     "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "waterDispensed" DECIMAL(10,2),
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RecyclingLog_isWalkIn_createdAt_idx" ON "RecyclingLog"("isWalkIn", "createdAt");

-- AddForeignKey
ALTER TABLE "RecyclingLog" ADD CONSTRAINT "RecyclingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
