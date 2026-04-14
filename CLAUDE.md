# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OctoCAT Supply is a full-stack TypeScript monorepo — a fictional supply chain management app for AI cat products. It consists of two workspaces: `api/` and `frontend/`.

## Commands

All primary commands are in the root `Makefile`. Run `make help` for a full list.

### Development
```bash
make install       # Install all dependencies (api + frontend)
make dev           # Start API (port 3000) + Frontend (port 5137) dev servers
make d
ev-api       # API only
make dev-frontend  # Frontend only
```

### Building
```bash
make build         # Build both workspaces
make build-api     # TypeScript compile (api/)
make build-frontend # Vite build (frontend/)
```

### Testing
```bash
make test          # Run all tests (api unit + frontend unit + e2e)
make test-api      # API Vitest unit/integration tests
make test-frontend # Frontend Vitest component tests
make test-e2e      # Playwright E2E tests
make test-coverage # API coverage report
```

**Running a single test file:**
```bash
cd api && npx vitest src/routes/branch.test.ts
cd api && npx vitest src/repositories/suppliersRepo.test.ts
cd frontend && npx playwright test tests/e2e/product-navigation.spec.ts
```

### Linting & Formatting
```bash
make lint          # ESLint check on both workspaces
make lint-fix      # Auto-fix linting issues
make format        # Prettier formatting
```

### Database
```bash
make db-init       # Run migrations + seed (full reset)
make db-migrate    # Migrations only
make db-seed       # Seed only
```

### Code Generation
```bash
make swagger       # Regenerate api/api-swagger.json from JSDoc comments in routes
```

## Architecture

### Data Model

```
Headquarters ──→ Branch ──→ Order ──→ OrderDetail ──→ Product ←── Supplier
                                            │
                                            └──→ OrderDetailDelivery ←── Delivery ←── Supplier
```

### API Layer (`api/src/`)

- **Routes** (`routes/`): Thin controllers — validation + orchestration only. Each file contains JSDoc Swagger comments that generate `api-swagger.json`.
- **Repositories** (`repositories/`): All data access logic. Use parameterized SQL via `better-sqlite3`. Never build raw query strings from user input.
- **Models** (`models/`): TypeScript types for each entity. camelCase in TS, snake_case in SQL columns.
- **Error types** (`utils/errors.ts`): `NotFound`, `Validation`, `Conflict` — thrown by repos, translated to HTTP status codes by Express middleware.
- **Database** (`db/`): SQLite file at `api/data/app.db` (in-memory `:memory:` for tests). WAL mode and foreign keys enabled by default.

Swagger UI: `http://localhost:3000/api-docs`

### Frontend Layer (`frontend/src/`)

- **Data fetching**: React Query (not ad-hoc `useEffect` + axios).
- **State**: React Query for server cache; `AuthContext` and `ThemeContext` for cross-cutting app state only.
- **Styling**: Tailwind utility classes. Abstract repeated class groups into components or `clsx` helpers rather than custom CSS.
- **Routing**: `react-router-dom` v7.

### Testing Strategy

- **API tests**: Vitest + Supertest against real Express app. Each test initializes a fresh in-memory SQLite DB by running all migrations before suite start.
- **Frontend E2E**: Playwright (Chromium + Edge). Playwright config auto-starts the dev server via `make dev` if not already running.

## Key Conventions

### API
- Keep route handlers thin — move logic into repositories.
- Use existing error classes (`NotFound`, `Validation`, `Conflict`) rather than inline status codes.
- Every schema change = new sequential SQL file in `api/database/migrations/`. Never edit existing migration files.
- Update `api/api-swagger.json` whenever adding or modifying routes (`make swagger`).
- Add indexes on FK columns and high-selectivity WHERE predicates.
- Watch for N+1 patterns — prefer JOIN queries over per-row SELECTs.

### Frontend
- Components should stay under ~150 LOC; split data-fetching and presentational concerns.
- Ensure semantic HTML and keyboard accessibility on all interactive elements.
- Never interpolate untrusted HTML into JSX.

### General
- Avoid `any` in TypeScript unless justified.
- Environment-variable-driven config; no hard-coded paths.
- PRs should include code + tests + updated Swagger/docs when behavior changes.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_FILE` | `./data/app.db` | SQLite file path (use absolute path to override) |
| `DB_ENABLE_WAL` | `true` | Write-Ahead Logging |
| `DB_FOREIGN_KEYS` | `true` | Referential integrity enforcement |
| `PORT` | `3000` | API server port |
| `VITE_API_URL` | `http://localhost:3000` | Frontend API base URL |

## MCP Servers (Optional)

`.vscode/mcp.json` configures GitHub and Playwright MCP servers. Requires Docker/Podman and a GitHub PAT for the GitHub server. Start via VS Code command palette: `MCP: List servers`.

## Git-Commits
Benutze IMMER Conventional Commits, wie hier beschrieben: https://www.conventionalcommits.org/en/v1.0.0/#specification