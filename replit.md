# ClauseShield

ClauseShield audits uploaded contract PDFs for common business traps and returns plain-English risks with negotiation-ready counter-clauses.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/clauseshield run dev` — run the ClauseShield web app and Express API
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/clauseshield/index.js` — Express server, PDF extraction, Groq audit, and `/api/analyze`
- `artifacts/clauseshield/public/index.html` — self-contained Tailwind dashboard served by Express
- `artifacts/clauseshield/.replit-artifact/artifact.toml` — app routing and development/production service configuration

## Architecture decisions

- Contract PDFs are held in memory for the duration of a request and are not persisted.
- The audit response is requested and validated as strict JSON before it reaches the client.
- The dashboard is served as a standalone HTML file so the `/api/analyze` endpoint and UI share one Express origin.

## Product

- Uploads PDF contracts using drag and drop or a file picker.
- Audits unlimited indemnification/liability, predatory payment terms, IP overreach, kill fees, and non-competes.
- Shows a 0–100 risk score, summary, issue cards, exact clause quotes, plain-English risks, and copyable counter-clauses.

## Gotchas

- ClauseShield owns the `/api` route prefix; the generic API scaffold is mapped to `/system-api` to avoid proxy collisions.
- `GROQ_API_KEY` must be present in Replit Secrets for audits to run. The default production model is `openai/gpt-oss-120b`; set `GROQ_MODEL` only when using another model available to the account.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
