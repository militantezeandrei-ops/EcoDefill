# EcoDefill System - Production Architecture

This Next.js application serves as the full-stack home for your EcoDefill System. It currently houses the secure backend API with role-based access, JWT authentication, and the database schema.

## Merging with your Stitch Frontend
Since your original frontend was designed in Stitch React, you should export the React application from Stitch and copy the components into this structure.

### 1. Components
Place all your Stitch `.jsx` or `.tsx` components into `/src/components`.

### 2. Pages / Routes
Next.js App Router uses directories to represent paths. To create your UI:
- **Mobile Student App**: Edit `/src/app/page.tsx` or `/src/app/student/page.tsx`.
- **Admin Dashboard**: Create `/src/app/admin/page.tsx` and place the admin dashboard component there.

### 3. API Integration
Your UI components should replace their mock logic with fetch calls to the Next.js API:
- `POST /api/auth/login` - Returns JWT token and User Role.
- `GET /api/user-balance` - Requires `Authorization: Bearer <token>`.
- `POST /api/earn-points` - Body `{ "amount": number }`. Max 10/day.
- `POST /api/redeem-points` - Body `{ "amount": number }`. Max 5/day.
- `POST /api/qr-generate` - Generates a 60-second expiring dynamic QR string.
- `POST /api/verify-qr` - Body `{ "token": string }`. Verifies if someone uses the QR.

## Database & Local Setup
1. Ensure you have a PostgreSQL database running locally or in the cloud.
2. Duplicate `.env.example` as `.env` and fill in `DATABASE_URL` and `JWT_SECRET`.
3. Run `npx prisma db push` to construct the tables.
4. Run `npm run dev` to start the server.

## Production Deployment (Vercel / Railway)
1. Push this entire repository (`d:/EcoDefillApp`) to GitHub.
2. Connect the repository to Vercel or Railway.
3. Add the `DATABASE_URL` and `JWT_SECRET` in the host's Environment Variables dashboard.
4. The deployment will automatically build the Next.js app and run `prisma generate` (handled by the postinstall script in `package.json`).
