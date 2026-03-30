# EcoDefill - Data Dictionary

This document describes the database schema for the EcoDefill project after the recent core data type migrations.

## System Overview
- **Database Engine**: PostgreSQL (Supabase)
- **Primary Model ID Strategy**: Version 4 UUID (Native UUID Type)
- **Currency/Points Precision**: Standard Decimal Fixed-Point (numeric 10,2)
- **Time Management**: UTC with Time Zone (timestamptz)

---

## Models

### User
Represents both Students and Admin accounts. Student balances are stored in points (1 point ≈ 100ml).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique identifier for the account. |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Account email address. |
| `fullName` | `TEXT` | NULLABLE | Display name. |
| `passwordHash` | `TEXT` | NOT NULL | Bcrypt hashed password. |
| `phoneNumber` | `VARCHAR(15)` | NULLABLE | Contact numbers. |
| `emailVerified` | `BOOLEAN`| DEFAULT false | Status of email verification. |
| `role` | `ENUM(Role)`| DEFAULT STUDENT | Role-based access control (STUDENT/ADMIN). |
| `balance` | `NUMERIC(10,2)`| DEFAULT 0.00 | Total point balance. |
| `course` | `VARCHAR(50)` | NULLABLE | Student course (e.g., BSIT). |
| `yearLevel` | `VARCHAR(10)` | NULLABLE | Current academic year. |
| `section` | `VARCHAR(10)` | NULLABLE | Student section. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Record creation time. |
| `updatedAt` | `TIMESTAMPTZ`| AUTO-UPDATE | Record modification time. |

### VerificationCode
Ephemeral codes used for registration and password resets.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique ID. |
| `email` | `VARCHAR(255)` | NOT NULL | Email associated with the code. |
| `codeHash` | `TEXT` | NOT NULL | Hashed value of the 6-digit code. |
| `purpose` | `VARCHAR(30)` | NOT NULL | e.g. REGISTER, RESET_PASSWORD. |
| `expiresAt` | `TIMESTAMPTZ`| NOT NULL | Expiration timestamp. |
| `used` | `BOOLEAN`| DEFAULT false | Usage status. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Token generation time. |
| `usedAt` | `TIMESTAMPTZ`| NULLABLE | When the token was consumed. |

### Transaction
Historical ledger of all point earnings and redemptions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique transaction ID. |
| `userId` | `UUID` | FOREIGN KEY (User.id) | Owning user. |
| `type` | `VARCHAR(20)` | NOT NULL | EARN or REDEEM. |
| `amount` | `NUMERIC(10,2)`| NOT NULL | Points moved. |
| `materialType` | `VARCHAR(20)` | NULLABLE | e.g. BOTTLE, CUP, PAPER (for EARN). |
| `count` | `INTEGER` | NULLABLE | Item count (for EARN). |
| `status` | `VARCHAR(20)` | DEFAULT "SUCCESS" | SUCCESS, REJECTED. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Event time. |

### QrToken
Active tokens used for hardware handshakes (Scanning for points or water).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique ID |
| `userId` | `UUID` | FOREIGN KEY (User.id) | Owning user. |
| `token` | `TEXT` | UNIQUE | Long JWT/Payload. |
| `shortToken` | `VARCHAR(20)` | UNIQUE, NULLABLE | Compact ECO-XXX code. |
| `type` | `VARCHAR(20)` | DEFAULT "EARN" | EARN or REDEEM. |
| `amount` | `NUMERIC(10,2)`| DEFAULT 0.00 | Targeted amount. |
| `expiresAt` | `TIMESTAMPTZ`| NOT NULL | Validity limit. |
| `used` | `BOOLEAN`| DEFAULT false | Success flag. |
| `usedAt` | `TIMESTAMPTZ`| NULLABLE | Use time. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Token record time. |

### MachineSession
Real-time hardware session logs for water dispensing.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique session ID. |
| `machineId` | `VARCHAR(50)` | NOT NULL | Target physical machine. |
| `userId` | `UUID` | FOREIGN KEY (User.id) | Interacting user. |
| `pointsToDeduct` | `NUMERIC(10,2)`| NOT NULL | Total points cost. |
| `amountToDispense` | `NUMERIC(10,2)`| NOT NULL | Volume in ml. |
| `status` | `VARCHAR(20)` | DEFAULT "INITIATED"| Current state. |
| `jti` | `TEXT` | UNIQUE | Replay prevention token. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Session start. |
| `expiresAt` | `TIMESTAMPTZ`| NOT NULL | Session TTL. |

### RecyclingLog
Deep analytics for the recycling machine performance.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Log ID. |
| `machineId` | `VARCHAR(50)` | NOT NULL | Hardware ID. |
| `userId` | `UUID` | FOREIGN KEY (User.id) | User who recycled. |
| `materialType` | `VARCHAR(20)` | NOT NULL | e.g. BOTTLE. |
| `count` | `INTEGER` | NOT NULL | Quantity. |
| `pointsEarned` | `NUMERIC(10,2)`| NOT NULL | Points given. |
| `status` | `VARCHAR(20)` | DEFAULT "SUCCESS" | Success or Error. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Process time. |

### MachineLog
Hardware health monitoring and system status pings.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Log ID. |
| `machineId` | `VARCHAR(50)` | NOT NULL | Hardware ID. |
| `status` | `VARCHAR(20)` | NOT NULL | ONLINE, OFFLINE, ERROR. |
| `message` | `TEXT` | NULLABLE | Status msg. |
| `pingMs` | `INTEGER` | NULLABLE | Connectivity latency. |
| `createdAt` | `TIMESTAMPTZ`| DEFAULT NOW() | Ping time. |
