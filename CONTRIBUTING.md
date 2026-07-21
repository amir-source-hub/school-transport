# Contributing

## Documentation-first workflow

Before implementing a feature, read the relevant files from the documentation map in `APP_DEVELOPMENT_PLAN.md`. Do not invent missing business rules, permissions, API fields, UI flows, or infrastructure decisions.

## Branches and commits

- Create short-lived branches from `main`, such as `feat/frontend-public-pages` or `fix/api-session-expiry`.
- Use Conventional Commits: `<type>(<scope>): <imperative summary>`.
- Keep commits focused and never commit secrets, local data, build output, private documents, or browser traces.

## Required checks

Run the checks relevant to the affected workspace before requesting review:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Changes affecting payments, contracts, authorization, student data, or accepted records require negative-path and ownership coverage in addition to success cases.

## Pull requests

Include requirement-to-implementation-to-test traceability. Frontend changes should include desktop, mobile, and RTL evidence plus loading, empty, error, unauthorized, and success-state coverage where applicable.
