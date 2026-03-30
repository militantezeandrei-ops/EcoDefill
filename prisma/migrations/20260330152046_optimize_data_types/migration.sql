/*
  Warnings:

  - The primary key for the `MachineLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `machineId` on the `MachineLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `status` on the `MachineLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The primary key for the `MachineSession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `machineId` on the `MachineSession` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `pointsToDeduct` on the `MachineSession` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `amountToDispense` on the `MachineSession` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `status` on the `MachineSession` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The primary key for the `QrToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `shortToken` on the `QrToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `type` on the `QrToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `amount` on the `QrToken` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The primary key for the `RecyclingLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `machineId` on the `RecyclingLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `materialType` on the `RecyclingLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `pointsEarned` on the `RecyclingLog` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `status` on the `RecyclingLog` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The primary key for the `Transaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `type` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `materialType` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `status` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `balance` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `course` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `yearLevel` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `section` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - Changed the type of `id` on the `MachineLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `MachineSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `MachineSession` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `QrToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `QrToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `RecyclingLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `RecyclingLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userId` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "MachineSession" DROP CONSTRAINT "MachineSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "QrToken" DROP CONSTRAINT "QrToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "RecyclingLog" DROP CONSTRAINT "RecyclingLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- AlterTable
ALTER TABLE "MachineLog" DROP CONSTRAINT "MachineLog_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "machineId" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "MachineLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MachineSession" DROP CONSTRAINT "MachineSession_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "machineId" SET DATA TYPE VARCHAR(50),
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ALTER COLUMN "pointsToDeduct" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "amountToDispense" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "MachineSession_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "QrToken" DROP CONSTRAINT "QrToken_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ALTER COLUMN "shortToken" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "usedAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "QrToken_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "RecyclingLog" DROP CONSTRAINT "RecyclingLog_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "machineId" SET DATA TYPE VARCHAR(50),
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ALTER COLUMN "materialType" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "pointsEarned" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "RecyclingLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "userId",
ADD COLUMN     "userId" UUID NOT NULL,
ALTER COLUMN "type" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "materialType" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "status" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneNumber" VARCHAR(15),
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "course" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "yearLevel" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "section" SET DATA TYPE VARCHAR(10),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMPTZ,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCode_email_key" ON "VerificationCode"("email");

-- CreateIndex
CREATE INDEX "VerificationCode_email_purpose_expiresAt_idx" ON "VerificationCode"("email", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "QrToken_userId_expiresAt_idx" ON "QrToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RecyclingLog_userId_createdAt_idx" ON "RecyclingLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_createdAt_idx" ON "Transaction"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrToken" ADD CONSTRAINT "QrToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSession" ADD CONSTRAINT "MachineSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingLog" ADD CONSTRAINT "RecyclingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
