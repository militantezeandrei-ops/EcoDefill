# EcoDefill Coding Conventions

Adherence to these conventions is mandatory for all development to ensure consistency and prevent silent failures.

## 🛡️ Architecture & Security

- **Admin Logic**: All admin routes must live under `src/app/admin/`.
- **User Dashboard**: All student-facing routes must live under `src/app/(dashboard)/`.
- **Auth Implementation**: Use `src/lib/auth.ts` for all JWT and password logic. Do not use external libraries directly for these tasks.
- **Middleware**: `src/middleware.ts` handles edge-level redirection for admin pages. API-level auth is handled via `authenticateRequest` in `src/lib/api-middleware.ts`.

## 📡 API Standards

- **Response Shape**: All API endpoints should return a standard JSON object:
  ```json
  {
    "success": boolean,
    "data": object | array | null,
    "message": string (optional message for UI),
    "error": string (optional error description)
  }
  ```
- **Error Handling**: Use the `handleApiError` utility in `src/lib/api-middleware.ts` to log errors and return a 500 status code consistently.

## 💾 Database (Prisma)

- **Single Client**: Always import `prisma` from `@/lib/prisma`. Manual instantiation of `PrismaClient` is forbidden.
- **Migrations**: Agents are NOT authorized to run `prisma migrate dev`. This must be done manually after human review.
- **Schema Comments**: Respect the comments in `schema.prisma`. They act as "locks" for business logic.

## 🎨 UI & Styling

- **Design Tokens**: Use Tailwind CSS classes. Follow the established colors in `tailwind.config.ts`.
- **Component Reusability**: Before creating a new component, check `src/components/` to see if a similar one exists.
- **Mobile First**: The user dashboard must be optimized for mobile devices (web-app view).

## 📝 General Rules

- **No Placeholders**: Do not use "Lorem Ipsum" or placeholder images. Use `generate_image` or actual project assets.
- **Semantic HTML**: Use proper tags (`<header>`, `<nav>`, `<main>`, `<footer>`, `<h1>`-`<h6>`) for SEO and accessibility.
- **Strict Typing**: Use TypeScript interfaces for all data structures (API responses, DB models, etc.).
