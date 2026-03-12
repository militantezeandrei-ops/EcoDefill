-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "course" TEXT,
    "yearLevel" TEXT,
    "section" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "materialType" TEXT,
    "count" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shortToken" TEXT,
    "type" TEXT NOT NULL DEFAULT 'EARN',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineSession" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsToDeduct" DOUBLE PRECISION NOT NULL,
    "amountToDispense" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "jti" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecyclingLog" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "pointsEarned" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecyclingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineLog" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "pingMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MachineLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_createdAt_idx" ON "Transaction"("userId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrToken_token_key" ON "QrToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "QrToken_shortToken_key" ON "QrToken"("shortToken");

-- CreateIndex
CREATE INDEX "QrToken_token_idx" ON "QrToken"("token");

-- CreateIndex
CREATE INDEX "QrToken_shortToken_idx" ON "QrToken"("shortToken");

-- CreateIndex
CREATE INDEX "QrToken_userId_expiresAt_idx" ON "QrToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MachineSession_jti_key" ON "MachineSession"("jti");

-- CreateIndex
CREATE INDEX "MachineSession_machineId_status_idx" ON "MachineSession"("machineId", "status");

-- CreateIndex
CREATE INDEX "MachineSession_jti_idx" ON "MachineSession"("jti");

-- CreateIndex
CREATE INDEX "RecyclingLog_userId_createdAt_idx" ON "RecyclingLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecyclingLog_machineId_createdAt_idx" ON "RecyclingLog"("machineId", "createdAt");

-- CreateIndex
CREATE INDEX "MachineLog_machineId_createdAt_idx" ON "MachineLog"("machineId", "createdAt");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrToken" ADD CONSTRAINT "QrToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineSession" ADD CONSTRAINT "MachineSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecyclingLog" ADD CONSTRAINT "RecyclingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
