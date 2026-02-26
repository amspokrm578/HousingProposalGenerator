# NYC Housing Development Proposal Generator

A full-stack portfolio application for generating data-driven housing development proposals in the NYC metropolitan area.

## Tech Stack

| Layer | Technology | Key Concepts |
|-------|-----------|--------------|
| **Frontend** | TypeScript, React, Vite | Redux Toolkit, RTK Query, custom hooks, Context API, Tailwind CSS |
| **Backend** | Python, Django, DRF | Nested serializers, ViewSets, signals, Celery tasks, Redis caching, comprehensive tests |
| **Database** | SQL Server (T-SQL) | Stored procedures, views with CTEs & window functions, triggers, UDFs |

## Architecture

```
React (Vite :5173) --> Django REST API (:8000) --> SQL Server (:1433)
                                  |
                           Celery Workers --> Redis (:6379)
```

## Prerequisites

- Docker & Docker Compose
- Python 3.12+
- Node.js 20+
- ODBC Driver 18 for SQL Server (for local dev without Docker)

## Quick Start

### 1. Start Infrastructure

```bash
docker compose up -d sqlserver redis
```

Wait ~30 seconds for SQL Server to initialize, then create the database:

```bash
docker exec -it djangotsproj-sqlserver-1 \
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'NYCHousing#2026!' -C \
  -Q "CREATE DATABASE nyc_housing"
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py deploy_sql       # Deploy stored procedures, views, functions, triggers
python manage.py seed_nyc_data    # Seed NYC neighborhoods, zoning, market & demographic data
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173**

### 4. Celery Workers (optional, for async tasks)

```bash
cd backend
celery -A config worker -l info
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/boroughs/` | GET | List all NYC boroughs |
| `/api/neighborhoods/` | GET | List/search/filter neighborhoods |
| `/api/neighborhoods/:id/` | GET | Neighborhood detail with zoning, market, demographic data |
| `/api/neighborhoods/:id/market_history/` | GET | Full market data time series |
| `/api/proposals/` | GET, POST | List/create proposals |
| `/api/proposals/:id/` | GET, PATCH, DELETE | Proposal CRUD |
| `/api/proposals/:id/calculate_score/` | POST | Trigger async feasibility score calculation |
| `/api/proposals/:id/generate_projections/` | POST | Trigger async 10-year financial projections |
| `/api/analytics/rankings/` | GET | Neighborhood rankings by development potential |
| `/api/analytics/market-trends/` | GET | Market trends with period-over-period changes |
| `/api/analytics/dashboard/` | GET | Borough-level proposal dashboard summary |

## T-SQL Objects

| Type | Name | Description |
|------|------|-------------|
| Stored Procedure | `sp_CalculateFeasibilityScore` | Scores proposals using weighted market, demographic, and zoning factors |
| Stored Procedure | `sp_GenerateFinancialProjections` | Generates 10-year revenue/expense/ROI projections using recursive CTEs |
| View | `vw_NeighborhoodRankings` | Ranks neighborhoods with `ROW_NUMBER()`, `RANK()`, `NTILE()` |
| View | `vw_MarketTrends` | Period-over-period market changes using `LAG()` |
| View | `vw_ProposalDashboardSummary` | Pre-aggregated borough-level metrics |
| Function | `fn_EstimateConstructionCost` | Borough-adjusted construction cost estimation |
| Trigger | `trg_ProposalStatusAudit` | Auto-logs status changes to history table |

## Running Tests

```bash
cd backend
python manage.py test proposals
```

## Demo Credentials

After seeding: **username** `demo` / **password** `demo1234`

## Project Structure

```
DjangoTSproj/
├── docker-compose.yml
├── backend/
│   ├── config/              # Django project settings, Celery config
│   ├── proposals/           # Core app: models, DRF API, signals, tasks, tests
│   ├── analytics/           # Analytics app: unmanaged models mapped to T-SQL views
│   └── sql/                 # Raw T-SQL scripts (stored procs, views, functions, triggers)
└── frontend/
    └── src/
        ├── store/           # Redux Toolkit store, slices, RTK Query API
        ├── hooks/           # Custom hooks (useProposalBuilder, useMarketAnalysis, useDebounce)
        ├── context/         # ProposalWizardContext for multi-step form state
        ├── components/      # Reusable UI components
        ├── pages/           # Route pages (Dashboard, Neighborhoods, Proposals, Builder)
        └── types/           # TypeScript type definitions
```
