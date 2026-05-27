# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip3 install -r requirements.txt
python manage.py migrate
python manage.py seed_nyc_data     # seed boroughs, neighborhoods, zoning, market & demographic data
python manage.py runserver         # http://localhost:8000
```

Run tests:
```bash
python manage.py test proposals                          # all proposal tests
python manage.py test proposals.tests.test_views        # single test module
```

Start Celery worker (requires Redis):
```bash
celery -A config worker -l info
```

Deploy T-SQL objects to SQL Server (only needed when `USE_MSSQL=1`):
```bash
python manage.py deploy_sql
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build
npm run lint     # eslint
```

### Docker (SQL Server + Redis)

```bash
docker compose up -d sqlserver redis
# After ~30s, create the database:
docker exec -it djangotsproj-sqlserver-1 \
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'NYCHousing#2026!' -C \
  -Q "CREATE DATABASE nyc_housing"
```

Then set `USE_MSSQL=1` before running migrations and `deploy_sql`.

## Architecture

### Backend (`backend/`)

Three Django apps:
- **`proposals/`** — core domain: all models, DRF ViewSets, filters, serializers, signals, Celery tasks, and the Green-Tape agent pipeline
- **`analytics/`** — unmanaged Django models (`managed = False`) mapped directly to T-SQL views (`vw_NeighborhoodRankings`, `vw_MarketTrends`, `vw_ProposalDashboardSummary`). These views only exist in SQL Server mode; in SQLite mode the analytics endpoints query via raw SQL migrations instead
- **`accounts/`** — thin user profile extension with token auth

**Database toggle:** SQLite is the default. Set `USE_MSSQL=1` to switch to SQL Server. The analytics unmanaged models and stored-procedure-based Celery tasks (`sp_CalculateFeasibilityScore`, `sp_GenerateFinancialProjections`) only function in SQL Server mode.

**Async flows:** Two Celery tasks in `proposals/tasks.py` call stored procedures directly via `connection.cursor()`. They are triggered in two ways:
1. Explicitly via DRF actions: `POST /api/proposals/:id/calculate_score/` and `generate_projections/`
2. Automatically via the `post_save` signal in `proposals/signals.py` when `lot_size_sqft`, `total_units`, or `neighborhood_id` change

**Green-Tape agent pipeline** (`proposals/agents.py`): a three-step LLM loop exposed at `POST /api/proposals/green-tape-run/`. Steps: draft generation → community board critic (returns JSON) → self-correction/optimization. The LLM client (`config/llm.py`) is provider-neutral and uses raw `requests` against any OpenAI-compatible endpoint, configured via `OPENAI_API_KEY`/`LLM_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`. Missing API key raises `LLMConfigurationError` and the pipeline returns a placeholder draft rather than crashing.

**Caching:** Borough and neighborhood list/map endpoints are view-cached. When Redis is available (`REDIS_URL` set), django-redis is used; otherwise falls back to in-memory cache.

### Frontend (`frontend/src/`)

Vite proxies all `/api/*` requests to `http://localhost:8000`, so no CORS issues in development.

State management:
- **RTK Query** (`store/api/apiSlice.ts`) handles all server state with tag-based cache invalidation. All API calls go through this single slice.
- **Redux slices** (`store/slices/`) manage UI-local state: `proposalSlice`, `neighborhoodSlice`, `uiSlice`
- **`ProposalWizardContext`** (`context/ProposalWizardContext.tsx`) holds multi-step form state for the proposal builder — intentionally kept out of Redux

Auth token is stored in `localStorage` under `authToken` and injected into every RTK Query request via `prepareHeaders`.

Pages map to routes in `App.tsx`:
- `/workspace` → `AgentWorkspacePage` — runs the Green-Tape pipeline interactively
- `/pdo/loop` → `SelfImprovementLoopPage` — visualizes the self-improvement loop
- `/map` → `OpportunityMapPage` — MapLibre GL map of neighborhoods
- `/proposals/new` → `ProposalBuilderPage` — multi-step wizard backed by `ProposalWizardContext`

### T-SQL objects (`backend/sql/`)

Deployed by `python manage.py deploy_sql`. Key objects:
- `sp_CalculateFeasibilityScore` — weighted scoring across market, demographic, and zoning factors
- `sp_GenerateFinancialProjections` — 10-year projections via recursive CTE
- `fn_EstimateConstructionCost` — borough-adjusted cost UDF called by stored procedures
- `trg_ProposalStatusAudit` — auto-populates `ProposalStatusHistory` on status changes (mirrors the Python `ProposalStatusHistory` model)

## Demo credentials

After seeding: **username** `demo` / **password** `demo1234`
