-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasSeenGuide" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STUDENT';
