# Contributing

Contributions should preserve the application's neutral legal posture, source hierarchy, privacy boundary, and explicit capability labels.

## Before Opening A Pull Request

```bash
npm ci
npm run lint
npm run build
npm run test:zero-key
npm run test:settings
npm run test:safe-storage
npm run release:test-seed-install
npm run test:search:fixture
npm run security:check
```

Do not commit downloaded court files, extracted text, AI caches, credentials, `.env` files, local audit output, or personally configured settings.

## Source And Legal-Analysis Rules

- Prefer PACER docket metadata or public RECAP copies, then official agencies, then project/archive material, then public mirrors.
- Never bypass authentication, fees, sealing, access controls, robots restrictions, or rate limits.
- Label allegations, party positions, court findings, jury verdicts, sentencing findings, and third-party claims separately.
- Cite the source URL, docket coordinate, document variant, and page when available.
- Do not claim collection completeness. Describe the searched names, dockets, date, source limits, and unresolved gaps.
- Keep political views, advocacy, and unsupported relationship inferences out of default analysis.
- Treat AI output as research assistance. Preserve deterministic validation and source-posture warnings around generative output.

## New Network Sources

Every new destination must be added to `server/network-policy.cjs` and documented in `NETWORK.md`. Use the shared safe-fetch boundary, bounded timeouts and response sizes, deterministic filenames, temporary files, PDF validation, SHA-256 recording, and retry limits.
