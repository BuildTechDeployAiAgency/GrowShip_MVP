# GrowShip MVP Architecture & Data Flow Guide

Purpose: Educate on how the system works end-to-end so another AI can generate process diagrams and visuals. Includes concise system inventory, data flows, contracts, and an actionable study plan.

---

## 1) Learning Plan (You Can Follow This Order)

1. Read “System Context” and “Component Inventory” to build a mental map.
2. Skim “Environment & Config” to understand what turns features on.
3. Study “Core Data Flows” (Auth, Upload+Process, Query) to see runtime behavior.
4. Review “API Endpoints & Contracts” so you know request/response shapes.
5. Check “RBAC & Protected Routes” to understand access controls.
6. Explore “Security & Observability” and “MVP Scope” for constraints and next steps.
7. Optional: Use the “Diagram Blueprints” to auto-generate visuals.

---

## 2) System Context (MVP)

- Actors
  - End User: brand/distributor/manufacturer staff and super-admins
  - Super Admin: platform-wide admin
- Applications
  - Frontend Web App (Next.js 15, React 19, TS) on Vercel or local
  - Data API (FastAPI) running as `Backend/` service
- Managed Services
  - Supabase (PostgreSQL + Auth + Storage)
  - OpenAI (for AI-assisted column mapping)
- Network Boundaries
  - Browser ↔ Frontend (HTTPS)
  - Frontend ↔ Backend (HTTPS, CORS-controlled)
  - Backend ↔ Supabase (HTTPS, service key/anon key)
  - Backend ↔ OpenAI (HTTPS, API key)

---

## 3) Component Inventory

- Frontend (Next.js)
  - Pages: `/auth/*`, `/dashboard`, `/profile/setup`, `/settings`, `/users`, `/sales`, etc.
  - Middleware: `middleware.ts` protects routes based on session/profile
  - Context & Hooks: auth, menus, dashboards, sales analytics
  - UI: Tailwind + Radix UI; charts (Recharts)
- Backend (FastAPI in `Backend/`)
  - Entry: `Backend/run.py` (uvicorn launcher), `Backend/app/main.py` (app + CORS)
  - Routes: `Backend/app/routes/excel_routes.py`
  - Utils:
    - `excel_processor.py` (CSV/Excel parsing, header detection, sheet scoring)
    - `openai_mapper.py` (AI mapping using OpenAI; fallback enabled)
    - `column_mapper.py` (heuristic keyword mapping & normalization)
  - Services: `supabase_service.py` (Supabase storage/DB ops, org materialized views)
  - Schemas: `schemas.py` (Pydantic models)
- Data Platform (Supabase)
  - Auth: user sessions
  - DB: profiles, roles, menus, memberships; file/document tracking; mapped data tables; materialized views
  - Storage: raw uploaded files
- External AI (OpenAI)
  - Transforms sample rows → standardized column mapping (fallback to heuristics if unavailable)

---

## 4) Environment & Config

- Frontend
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_APP_URL` (e.g., `http://localhost:3000`)
- Backend
  - `OPENAI_API_KEY` (required for AI mapping; fallback exists)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - Optional: `ALLOWED_ORIGINS` (comma-separated), `ENVIRONMENT` (`production` disables reload), `HTTP_PROXY`, `HTTPS_PROXY`
  - Local run: `python Backend/run.py` (defaults to port `8880`)
- CORS
  - Allowed origins by default: `http://localhost:3000`, `https://growship-red.vercel.app`, `https://*.vercel.app`
  - Override with `ALLOWED_ORIGINS`

---

## 5) Core Data Flows

A) Authentication & Route Protection
1. User signs in via Supabase auth (frontend).
2. Frontend middleware verifies session; fetches profile.
3. If `suspended` → `/auth/suspended`; if `pending` → dashboard-only; if incomplete profile → `/profile/setup`.
4. User menu & permissions fetched per role and cached.

B) Upload & AI Mapping (Excel/CSV)
1. User initiates upload from frontend; sends `multipart/form-data` to Backend `/api/v1/excel/upload-and-process` with `user_id`, `organization_id`, optional `sheet_name`, `sample_size`.
2. Backend saves file locally in `uploads/`, triggers background upload to Supabase Storage; creates/updates a document record with status.
3. Backend reads file (Excel/CSV), detects headers & best sheet, samples rows.
4. Backend requests OpenAI mapping (fallback to heuristic mapping if OpenAI unavailable).
5. Data normalized (months, types, nulls), validated, and batch-inserted into user/org-specific tables; org materialized views updated.
6. Backend returns mapping, validation quality, document status, and counts.

C) Data Retrieval & Analytics
1. Frontend queries mapped data via Backend endpoints (pagination/filters).
2. Analytics endpoints (top products, sales by country, monthly trends, category performance) use materialized views or aggregated queries.
3. Admins query org-level data; users query their own data.

---

## 6) API Endpoints & Contracts (Backend Prefix `/api/v1/excel`)

- Upload/Management
  - POST `/upload` → { filename, sheets, message }
  - POST `/upload-and-process` → { filename, sheet_used, mapping, validation, total_rows, document_id, status }
  - DELETE `/document/{document_id}` → { deleted: true }
  - GET `/sheets/{filename}` → [sheet names]
- Data
  - GET `/data/{filename}/{sheet_name}` → { data, columns, total_rows, offset, limit }
  - POST `/data/{filename}/{sheet_name}/filter` → filtered data results
  - GET `/stats/{filename}` → stats per sheet/file
- AI Mapping
  - POST `/map-columns/{filename}` → { mapping, validation, mapped_data_sample }
  - GET `/mapped-data/{filename}` → mapped data (paginated)
  - GET `/mapped-data-summary/{filename}` → summary stats
- Detection/Debug
  - GET `/detect-best-sheet/{filename}` → best sheet + scores
  - GET `/debug/{filename}` → structure/debug info
- Supabase Views
  - GET `/data/{organization_id}/{user_id}` → user-level data (paginated)
  - GET `/admin/data/{organization_id}` → org-level data view
- Root/Health
  - GET `/` → banner, GET `/health`, GET `/cors-info`, GET `/debug/supabase`

Notes:
- Pagination typically via `limit`, `offset` query params.
- Upload requires `multipart/form-data` and includes `user_id`, `organization_id`.

---

## 7) Data Contracts (Representative)

- Upload-and-Process (Response)
  - filename: string
  - sheet_used: string
  - mapping: Record<StandardColumn, SourceColumn>
    - Standardized examples: Product Name, Category, Country, Year, Month, Sales Count, Sales Value (USD), SOH, Description, Type
  - validation: { mapping_quality: "poor|good|excellent", successful_mappings: number, notes?: string }
  - total_rows: number
  - document_id: string (uuid)
  - status: "processing|success|failed"

- Mapped Data (Response)
  - data: Array<Record<string, any>>
  - columns: string[]
  - total_rows: number
  - offset: number
  - limit: number

---

## 8) RBAC & Protected Routes (Frontend)

- Role names: super_admin, brand_admin/finance/manager/user, distributor_admin/finance/manager/user, manufacturer_admin/finance/manager
- User status: pending, approved, suspended
- Middleware guards pages: `/dashboard`, `/profile`, `/settings`, `/users`, `/sales`, etc.
- Menu items per role from Supabase; cached client-side; background refetch.

---

## 9) Security & Observability

- Security
  - CORS-restricted backend; configurable origins
  - Supabase keys kept server-side; use anon key on client
  - Documents tracked with status; deletion endpoint cleans associated data
  - Input validation at backend (Pydantic); safe CSV/Excel reading and type normalization
- Observability
  - Health endpoints `/health`, `/cors-info`, `/debug/supabase`
  - Logging via uvicorn; enable `ENVIRONMENT=production` for concise logs

---

## 10) MVP Scope & Trade-offs

- In-Scope (MVP)
  - Auth + profile + role menus
  - Upload Excel/CSV, AI mapping with fallback
  - Store mapped data; query/paginate/filter
  - Basic analytics: top products, sales by country, monthly trends, category performance
- Out-of-Scope (MVP)
  - PDF ingestion (planned in code but not wired)
  - Complex data lineage/versioning
  - SSO providers and fine-grained ABAC
  - Real-time streaming updates
- Risks/Constraints
  - AI mapping depends on OpenAI availability; heuristic fallback reduces accuracy
  - Large files require upload UX with progress + state polling
  - Materialized views must be refreshed/rebuilt on updates (consider schedule/triggers)

---

## 11) Diagram Blueprints (For Auto-Generated Visuals)

[diagram: mermaid system-context]
graph LR
  U[End User] -->|HTTPS| FE[Next.js Frontend]
  FE -->|HTTPS REST| BE[FastAPI Backend]
  BE -->|Auth/DB/Storage| SB[Supabase]
  BE -->|AI Mapping| OA[OpenAI API]
  subgraph Browser
    U
    FE
  end
  subgraph Cloud
    BE
    SB
    OA
  end
[/diagram]

[diagram: mermaid sequence-upload-process]
sequenceDiagram
  participant User
  participant Frontend as Next.js (FE)
  participant Backend as FastAPI (BE)
  participant Storage as Supabase Storage
  participant DB as Supabase DB
  participant OpenAI as OpenAI API

  User->>Frontend: Select file (xlsx/csv), submit
  Frontend->>Backend: POST /upload-and-process (multipart, ids)
  Backend->>Storage: Store raw file (background)
  Backend->>Backend: Parse file, detect sheet, sample rows
  Backend->>OpenAI: Request column mapping (fallback to heuristic)
  OpenAI-->>Backend: Mapping result
  Backend->>DB: Normalize + batch insert mapped data
  Backend-->>Frontend: Mapping + status + counts
  Frontend-->>User: Show status and results
[/diagram]

[diagram: mermaid er]
erDiagram
  user_profiles ||--o{ user_memberships : has
  organizations ||--o{ user_memberships : has
  roles ||--o{ role_menu_permissions : grants
  sidebar_menus ||--o{ role_menu_permissions : protects
  user_profiles {
    uuid id
    uuid user_id
    text role_name
    text role_type
    boolean is_profile_complete
    text user_status
    uuid organization_id
  }
  organizations {
    uuid id
    text name
    text organization_type
  }
  roles {
    uuid id
    text role_name
    int permission_level
  }
  sidebar_menus {
    uuid id
    text menu_label
    text route_path
    boolean is_active
  }
  role_menu_permissions {
    uuid id
    uuid role_id
    uuid menu_id
    boolean can_view
    boolean can_edit
  }
[/diagram]

[diagram: dot data-flow]
digraph G {
  rankdir=LR;
  User -> Frontend [label="HTTPS (Browser)"];
  Frontend -> Backend [label="REST /api/v1/excel/*"];
  Backend -> "Supabase Storage" [label="Upload raw file (bg)"];
  Backend -> "Supabase DB" [label="Insert mapped rows / refresh views"];
  Backend -> OpenAI [label="AI column mapping"];
  Frontend -> Backend [label="Query mapped data / analytics"];
  Backend -> Frontend [label="JSON responses (paginated/filter)"];
}
[/diagram]

---

## 12) Quick Ops Notes

- Local dev
  - FE: `npm run dev` at `http://localhost:3000`
  - BE: `python Backend/run.py` at `http://localhost:8880`
- Config drift
  - If deploying FE to new domain, add to `ALLOWED_ORIGINS`
  - Verify Supabase and OpenAI keys present on backend host
- Troubleshooting
  - Use `/health`, `/cors-info`, `/debug/supabase`
  - Check backend logs for mapping errors; fallback kicks in if OpenAI unavailable

