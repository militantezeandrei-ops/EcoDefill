# EcoDefill — Web & Backend Architecture Guide

This document details the **Next.js 14 Web Application**, **Serverless API Routes**, **Prisma ORM Database Models**, and **Authentication System**.

---

## 1. Web Architecture Overview

* **Framework**: Next.js 14 App Router (React 18, TypeScript).
* **Database**: PostgreSQL (Hosted on Neon Serverless Postgres / Supabase).
* **ORM**: Prisma ORM (`v5.10.2`).
* **Deployment**: Vercel Serverless Edge Network.
* **Styling**: Tailwind CSS with custom glassmorphism and modern dashboard palettes.

---

## 2. PostgreSQL Database Schema (Prisma)

Defined in `prisma/schema.prisma`:

### Core Models Summary:

#### 1. `User` Model
Stores students and administrators.
* `id` (`UUID`, Primary Key)
* `email` (`String`, Unique)
* `password` (`String`, bcrypt hashed)
* `fullName` (`String`)
* `role` (`Role`: `STUDENT` | `ADMIN`)
* `course` (`String?`) & `section` (`String?`) & `yearLevel` (`String?`)
* `balance` (`Decimal(10,2)`, 1 point = 100ml water)
* `hasSeenGuide` (`Boolean`)
* `createdAt` & `updatedAt` (`Timestamptz`)

#### 2. `Transaction` Model
Main immutable financial and recycling ledger.
* `id` (`UUID`, Primary Key)
* `userId` (`UUID`, Foreign Key $\rightarrow$ User)
* `type` (`TransactionType`: `EARN` | `REDEEM`)
* `amount` (`Decimal(10,2)`, points credited or deducted)
* `itemType` (`String?`, e.g. `"BOTTLE"`, `"CUP"`, `"PAPER"`)
* `count` (`Int?`, quantity of items deposited)
* `machineId` (`String?`, identifier of physical machine)
* `createdAt` (`Timestamptz`)

#### 3. `QrToken` Model
Short-lived single-use QR tokens for physical machine interaction.
* `id` (`UUID`, Primary Key)
* `token` (`String`, Unique, e.g. `"ECO-8FC21EE5"`)
* `userId` (`UUID`, Foreign Key $\rightarrow$ User)
* `type` (`QrType`: `RECEIVE` | `REDEEM`)
* `status` (`QrStatus`: `PENDING` | `SCANNED` | `USED` | `EXPIRED`)
* `amount` (`Decimal(10,2)`, points to transfer or water ml to dispense)
* `expiresAt` (`Timestamptz`, typically 5-10 minutes validity)
* `createdAt` (`Timestamptz`)

#### 4. `MachineStatus` & `RecyclingLog` Models
Telemetry logs capturing physical dispenser health, online heartbeats, water reservoir levels (`"Full Tank"`, `"Low"`, etc.), and anonymous walk-in recycling counts.

---

## 3. Serverless API Route Endpoints

Located in `src/app/api/`:

| Endpoint | Method | Caller | Purpose / Description |
| :--- | :---: | :--- | :--- |
| **`/api/verify-qr`** | `POST` | ESP32 DevKit | Core verification endpoint when QR-CAM scans a token. Validates token authenticity, deducts/credits user balance, records transaction, and returns `{ success: true, waterAmount: <ml>, pointsDeducted: <N>, userName: "..." }`. |
| **`/api/qr-generate`** | `POST` | Mobile / Web App | Creates a fresh, cryptographically unique `QrToken` for receiving points or redeeming water. |
| **`/api/qr-status`** | `GET` | Mobile / Web App | Polled every 1 second by the app to detect when the physical machine has scanned the active token. |
| **`/api/user-balance`** | `GET` | Mobile / Web App | Returns live user balance, student profile data, and today's total earned/redeemed stats. |
| **`/api/add-point`** | `POST` | ESP32 DevKit | Records anonymous (walk-in without QR) recycling deposits into the system ledger. |
| **`/api/machine-status`** | `POST` | ESP32 DevKit | Heartbeat telemetry reporting machine online status and tank water levels. |
| **`/api/machine-walkin`** | `POST` | ESP32 DevKit | Logs item counts (bottles, cups, papers) for walk-in deposits. |
| **`/api/auth/login`** | `POST` | Mobile / Web App | Authenticates user credentials and returns JWT bearer token. |
| **`/api/auth/register`** | `POST` | Mobile / Web App | Registers a new student account with course, year level, and initial welcome balance. |
| **`/api/auth/request-code`**| `POST` | Mobile / Web App | Dispatches a 6-digit email verification code for password reset. |
| **`/api/auth/reset-password`**| `POST` | Mobile / Web App | Validates verification code and sets new encrypted password. |
| **`/api/leaderboard`** | `GET` | Mobile / Web App | Returns top recyclers and course rankings. |
| **`/api/history`** | `GET` | Mobile / Web App | Returns paginated transaction history for the logged-in user. |

---

## 4. Web Application Routes

Located in `src/app/`:

* `/(auth)/login` & `/(auth)/register`: Public authentication portals.
* `/(dashboard)/dashboard`: Student overview, live points card, and quick action cards.
* `/(dashboard)/redeem`: Point-to-water redemption calculator and QR presenter.
* `/(dashboard)/qr`: Standalone QR presenter and web scanner.
* `/(dashboard)/history`: Full activity ledger with transaction filters.
* `/(dashboard)/leaderboard`: Campus gamification rankings.
* `/(dashboard)/profile`: Student profile management, course details, and account settings.
* `/(admin)/admin/...`: Full administrative control center for user management, machine fleet monitoring, recycling analytics, and system audit logs.
