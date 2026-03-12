# 🌿 EcoDefill

**EcoDefill** is a modern, IoT-integrated waste management and water dispensing system. It encourages recycling by rewarding users with points that can be redeemed for water at physical dispensing kiosks.

---

## 🚀 Features

- **User Mobile Dashboard**: Track your recycling progress and point balance.
- **Smart QR System**: High-density QR tokens for seamless interaction with IoT hardware.
- **IoT Integration**: Synchronized communication between Next.js backend and ESP32-based hardware.
- **Admin Portal**: Comprehensive dashboard for managing users, transactions, and hardware health.
- **Atomic Transactions**: Secure point handling using Prisma transactions to prevent balance errors.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide React
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based auth with Middleware protection
- **Hardware Communication**: RESTful HTTP polling/status updates

---

## 📥 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

- **Node.js**: v18.x or later
- **PostgreSQL**: A running instance (local or hosted like Supabase/Neon)
- **npm** or **yarn**

### 1. Clone the repository

```bash
git clone https://github.com/militantezeandrei-ops/EcoDefill.git
cd EcoDefill
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory and add the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecodefill"
DIRECT_URL="postgresql://user:password@localhost:5432/ecodefill"

# Security
JWT_SECRET="your_super_secret_jwt_key"
MACHINE_SECRET="your_shared_iot_secret_key"

# Next Auth (if applicable)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="another_secret_key"
```

### 4. Database Setup

Run the Prisma migrations to create the database schema:

```bash
npx prisma generate
npx prisma db push
```

*(Optional) Seed the database with initial admin and sample data:*
```bash
npm run seed
```

### 5. Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## 🏗️ Project Structure

- `/src/app`: Application routes and API logic.
- `/src/components`: Reusable UI and layout components.
- `/src/lib`: Shared utilities (auth, prisma, rate limiting).
- `/prisma`: Database schema and seeding scripts.
- `/public`: Static assets.

---

## ⚙️ IoT Communication Overview

1. **Earn Points**: User scans their personal QR at the machine. Machine hits `/api/verify-qr` to increment balance.
2. **Redeem Points**: User requests water in-app. App generates a shortToken QR.
3. **Dispense**: Machine scans the token. Machine hits `/api/verify-qr`. If approved, the machine activates the relay for the specified duration.

---

## 📄 License

This project is for educational/private use. Licensed under the MIT License.
