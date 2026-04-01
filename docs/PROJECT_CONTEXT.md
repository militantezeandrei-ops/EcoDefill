# EcoDefill - Project Context and Architecture

**Last Updated:** 2026-03-31

Welcome to **EcoDefill's** project documentation. This file serves as the project's "brain" to preserve context across AI sessions. Whenever starting a new task, use this file to understand the stack, architecture, and established patterns.

## 🛠 Tech Stack

*   **Frontend Framework:** Next.js (v14.2, App Router) & React 18
*   **Styling:** Tailwind CSS (v3.4, with Forms & Container Queries plugins)
*   **Database & ORM:** PostgreSQL + Prisma (v5.10)
*   **Mobile Framework:** Capacitor (v8) for native Android/iOS compilation
*   **Authentication & Security:** Custom JWT / bcryptjs flow + Nodemailer
*   **Icons & Assets:** Lucide React, HTML5-QRCode, React-QRCode
*   **Data Visualization:** Recharts

## 📁 Architecture Overview

The app is a Next.js web application wrapped by Capacitor for mobile consumption (`com.ecodefill.app`). 
*   **Offline Mode:** Handled natively via Capacitor configuration routing to `offline.html` and displaying custom UI banners.
*   **Web App vs Mobile:** The app behaves natively on mobile (zero scrollbars, native keyboards, splash screens) but serves as a fully featured web portal for admins.

## 🗄 Database Model (Prisma)

**Key Conventions to Remember:**
1.  **UUIDs:** We use UUIDs (`@db.Uuid`) for primary keys (`id`), not auto-incrementing integers.
2.  **Decimals:** Finances, points, and balances are stored as `Decimal` (`@db.Decimal(10, 2)`). When working in TypeScript, remember to serialize/deserialize them properly as they arrive from Prisma as `Decimal` objects, but are often expected as `number` on the frontend.
3.  **Roles:** Handled via the `Role` enum (`STUDENT` | `ADMIN`).

**Core Models:**
*   **`User`**: Both students and admins. Contains `balance` (points where 1 point = 100ml water), `role`, `course`, `yearLevel`, and an onboarding flag (`hasSeenGuide`).
*   **`Transaction`**: Records point events (`EARN` or `REDEEM`).
*   **`QrToken`**: Short-lived tokens used for interaction with hardware/dispensers.
*   **`MachineSession`** & **`RecyclingLog`**: Handles hardware interaction sessions (ESP32) with JWT IDs (JTI) for replay prevention.

## 🎨 UI/UX Design System Rules

*   **Aesthetics First:** We prioritize a premium, hyper-modern aesthetic (dark mode by default for splash, but clean light/dark separation on dashboards).
*   **Utility Classes:** Rely purely on Tailwind CSS utility classes. Avoid inline style objects unless absolutely necessary for dynamic layout calculations.
*   **Admin Dashboard:** Follows a data-dense, "command-center" layout. Charts (using Recharts) use temporal filtering (Today, Week, Month).
*   **Responsive:** Ensure layouts are fluid.

## ⚠️ Common Developer Gotchas for this Project

1.  **Prisma Type Errors:** Always run `npx prisma generate` after modifying `schema.prisma`. Beware of the `Decimal` type mismatch if you try doing arithmetic directly on the object returned from the ORM.
2.  **Server Actions vs API Routes:** We make heavy use of `/api/...` routes.
3.  **Capacitor Sync:** Ensure any changes to Next.js routing do not break the Capacitor offline sync expectations.
4.  **Date handling:** Built over `Timestamptz`.

***

*When interacting with the AI, you can simply refer to this document by saying: "Read PROJECT_CONTEXT.md before modifying X".*
