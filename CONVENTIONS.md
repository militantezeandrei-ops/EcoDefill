# EcoDefill coding conventions

## Architecture and authentication

- Admin pages: src/app/admin/. Student dashboard: src/app/(dashboard)/. Public authentication remains under src/app/login/, register/, and forgot-password/.
- Use src/lib/auth.ts for shared JWT/password logic and src/lib/api-middleware.ts for API authentication/error helpers. Inspect endpoint-specific token protocols before changing them.
- src/middleware.ts handles web redirects; APIs enforce applicable authorization themselves.
- Never copy secrets into documentation, logs, or templates.

## API compatibility

- Preserve response fields consumed by web, Flutter, and firmware. Existing responses do not all use a common envelope.
- For new endpoints prefer { success, data, message?, error? }; do not silently reformat established contracts.
- Use handleApiError where appropriate; validate external inputs.
- Check affected callers when changing tokens, polling responses, units, or machine payloads.

## Database and behavior

- Import the shared Prisma client from @/lib/prisma; do not instantiate another application client.
- Agents must not run prisma migrate dev. Schema migrations require human review and manual execution under the existing project policy.
- Do not substitute db push, reset, or other schema-changing commands as a workaround.
- Respect schema comments. Verify implementation before changing limits, expiry, balances, or session states.
- Preserve transaction boundaries/accounting unless the requested change addresses them.

## UI and completion

- Reuse components, hooks, and helpers before adding equivalents.
- Use existing Tailwind tokens and mobile_app/lib/core/theme/app_theme.dart.
- Optimize student screens for mobile; use semantic, accessible HTML.
- Use meaningful TypeScript types and real content/assets.
- Follow AGENTS.md for verification; update affected documentation without expanding small fixes into full-project audits.
