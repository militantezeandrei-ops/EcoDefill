# EcoDefill Project Map

This document serves as the single source of truth for the project's structure, API routes, and database models. Always consult this map before creating new features or modifying existing ones.

## 📂 Core Architecture

- **`src/app`**: Next.js App Router.
  - `(dashboard)/`: Student-facing pages (History, Profile, QR).
  - `admin/`: Admin-facing dashboard and tools.
  - `api/`: Backend API routes.
- **`src/components`**: Shared React components.
- **`src/lib`**: Core utilities (Prisma, Auth, API Client).
- **`prisma/`**: Database schema and seeds.

## 📡 API Route Mapping

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | POST | Student login, returns JWT. |
| `/api/auth/register` | POST | Student registration. |
| `/api/admin/login` | POST | Admin login. |
| `/api/qr-generate` | POST | Generate EARN/REDEEM QR tokens. |
| `/api/verify-qr` | POST | Validate QR tokens (used by IoT/Admin). |
| `/api/machine-status` | GET/POST | IoT machine polling and heartbeat. |
| `/api/add-point` | POST | Direct point addition (e.g., from machine). |
| `/api/user-balance` | GET | Current logged-in user's point balance. |
| `/api/user-transactions` | GET | Transaction history for current user. |
| `/api/redeem-initiate` | POST | Creates a MachineSession and generates a shortToken for water redemption QR. |
| `/api/admin/polling/activities` | GET | Real-time event polling for admin notifications. |

## 🗄️ Database Models (Prisma)

- **`User`**: Main account model (Students and Admins). Stores balance, role, and academic info.
- **`Transaction`**: Records of all EARN/REDEEM events.
- **`QrToken`**: Temporary tokens for QR-based interactions.
- **`MachineSession`**: Active water dispensing or recycling sessions.
- **`RecyclingLog`**: Detailed logs of material types and counts recycled.
- **`MachineLog`**: Health and debug logs for IoT hardware.

## 🛠️ Shared Utilities (`src/lib`)

- **`prisma.ts`**: Unified Prisma client instance. **NEVER** instantiate Prisma manually elsewhere.
- **`auth.ts`**: JWT signing/verification and password hashing via `bcryptjs`.
- **`api.ts`**: Client-side `apiClient` wrapper for standardized fetch requests.
- **`api-middleware.ts`**: Server-side helpers for authenticating API requests.
- **`ratelimit.ts`**: Basic rate-limiting logic (if applicable).
