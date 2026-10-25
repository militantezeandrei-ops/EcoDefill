# Reusing features

A reusable feature module packages a capability. A starter kit is a project template with modules connected. A shared package coordinates updates across projects. An agent skill describes a workflow, not implementation code.

| Candidate | Starting points | Configuration to extract |
| --- | --- | --- |
| Web UI | src/components/ui/, src/components/layout/ | Branding, navigation, theme |
| Flutter QR display | mobile_app/lib/core/widgets/qr_display_card.dart | Payload, expiry, appearance |
| API clients | src/lib/api.ts; mobile_app/lib/core/network/api_client.dart | URL, storage, error contract |
| Cache | mobile_app/lib/core/storage/local_cache.dart | Keys, models, logout cleanup |
| Reports | src/lib/admin-reports.ts; src/lib/pdf.ts | Data, columns, branding |
| Auth/verification | src/lib/auth.ts; src/lib/verification.ts; src/app/api/auth/ | Schema, roles, mail, token settings |
| QR transactions | QR APIs, mobile QR/redeem features, DevKit | Units, limits, expiry, persistence, protocol |

These are candidates, not independent packages today. Start with small UI modules. Review assumptions and add meaningful contract/behavior checks before extracting auth/accounting.

## Extraction checklist

- Define public inputs, outputs, errors, dependencies.
- Separate generic behavior from EcoDefill schema/machine policies.
- Configure URLs, credentials, branding, domain constants.
- Include setup instructions, a minimal example, relevant verification.
- Preserve licenses. Exclude secrets, user data, generated output, local databases.
- Keep code here until an actual second use justifies extraction.

Use a template repository for a personal starter kit. Add shared packages when coordinated consumer updates become useful.
