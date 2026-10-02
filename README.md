# ccms-identity-service

> **Pages live with their repo.** Identity serves only sign-in, password reset, Accounts and the role home pages (`/login`, `/reset-password`, `/accounts`, `/office`, `/campus`). Offices, Services, Calendar and the public service list are pages of `ccms-catalogue-service`. Through the gateway they share one address. On its own port, set `CATALOGUE_SERVICE_URL` (Accounts needs the office list) and `NEXT_PUBLIC_CATALOGUE_APP_URL` (nav links to Catalogue pages).


Part of the Citizen's Charter Compliance/Monitoring System (CCMS). One service = one repository = one database (`ccms_identity`).

Stack: Next.js (App Router, plain JavaScript) · Tailwind CSS · TypeORM · PostgreSQL. No TypeScript, no Material UI.

```
ccms-identity-service/
├── src/
│   ├── app/            # App Router pages + layouts
│   ├── app/api/        # API routes (backend logic for this service)
│   ├── components/     # React + Tailwind components (AppShell, Modal, ...)
│   └── lib/            # entities/, data-source.js, auth + API helpers
├── scripts/            # sync-db.js and other one-off scripts
├── test/               # node:test tests
├── public/
├── package.json
├── next.config.js
└── README.md
```

## Run it

```bash
cp .env.example .env.local     # or use ccms-local-stack, which does this for every service
npm install
npm run dev                    # http://127.0.0.1:3001 (open the app through the API gateway)
```

Services listen on `127.0.0.1` only. The browser talks to the API gateway, never to a service directly.

## Database (TypeORM, auto-created)

Tables are created from the entities in `src/lib/entities/` the moment the service starts, so you only
need an empty PostgreSQL database (`ccms_identity`, created by ccms-local-stack). Connect pgAdmin to it
and the tables are there. `npm run db:sync` does the same without starting the app.

`DB_SYNCHRONIZE=true` is right for development. For production set it to `false` and use TypeORM
migrations so schema changes are reviewed instead of applied automatically.

## Auth

Every route uses `requirePermission(roles, officeScope)` from `ccms-shared`. Tokens are verified offline
against Identity's public keys (`IDENTITY_JWKS_URL`). Backend-only endpoints use the shared service key.
Errors always use `{ error: { code, message, details, correlation_id, timestamp } }`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint |
| `npm run check:time` | Fails on server-local date methods (use the Asia/Manila helpers in `ccms-shared`) |
| `npm test` | node:test (needs a PostgreSQL server; set `TEST_PG_URL`) |
| `npm run db:sync` | Create/update tables from the entities |
| `npm run ci` | lint, check:time, test, build |

`ccms-shared` is installed as a copy (`install-links=true` in `.npmrc`). After changing it, run
`npm install` again in this repo.
