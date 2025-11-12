# GrowShip Feature Promo Brief 001

## Objective
- Enable a companion AI to craft a high-energy promo deck **and** a 90–120 second video voiceover that sells GrowShip’s current capabilities.
- Emphasize tangible supply-chain workflows already live in the product while hinting at enterprise polish.
- Audience: brand and channel leaders evaluating how to unify distributors/manufacturers inside one SaaS command center.

## Tone, Pacing, and Audio Direction
- Voiceover: confident, optimistic, ~135 wpm, North American accent, light grit on emphatic words.
- Music bed: modern percussive electronica at 98 BPM; duck volume -12 dB during heavy data callouts.
- Sound design cues: subtle swooshes for slide reveals, tactile clicks when KPIs animate, low whoosh when switching between roles.
- Visual palette: teal (#0f766e), deep navy (#0b1f2b), warm white background accents, matching UI screenshots whenever possible.

## Deliverables Checklist
1. **Presentation** – 8 core slides + appendix (landscape 16:9) ready for Keynote/Slides; export static PNGs for video.
2. **Video & Audio Script** – 90–120 sec narrative aligned with slides; include timestamped cues (mm:ss) and notes for on-screen copy/B-roll.
3. **Asset Pull List** – capture UI from referenced files (see “Feature Proof Points”) to keep visuals authentic.

## Narrative Blueprint (Slides & Scenes)
| # | Slide / Scene Title | Key Message & Feature Hook | Visual Direction | Voiceover Prompt |
|---|---------------------|----------------------------|------------------|------------------|
| 1 | **Cold Open – “Ship Growth, Not Spreadsheets”** | Multi-tenant hub synchronizes brands, distributors, manufacturers (`components/landing/hero-section.tsx`). | Macro shot of freight → smash cut to GrowShip hero UI; overlay tag “One Command Center”. | “GrowShip unifies every partner in your supply chain with one login, one data truth, and zero swivel-chair work.” |
| 2 | **Role-Based Welcome** | Dedicated portals + demo access funnel (`components/landing/landing-page.tsx`, `/app/auth/*`). | Animate buttons for Brand / Distributor / Manufacturer; show instant redirect logic. | “Each stakeholder gets a tailored workspace the second they sign in—or demo access if they just want to explore.” |
| 3 | **Secure Onboarding & Governance** | Enhanced auth, profile wizard, permission-aware sidebar (`contexts/enhanced-auth-context.tsx`, `components/common/protected-page.tsx`, `components/layout/sidebar.tsx`). | Show pending-user warning banner + lock icons gating menus. | “Status-aware guardrails keep pending accounts on the dashboard while approved teams roam freely across modules.” |
| 4 | **Pulse Dashboard** | KPI grid + filters for distributors/revenue (`app/dashboard/dashboard-content.tsx`, `components/dashboard/metrics-cards.tsx`). | Animate four KPI cards (Total Distributors 4, Revenue $202.6K, etc.) + search/filter component. | “Leaders get an instant pulse: live distributor counts, revenue, overdue invoices, growth trends, and dynamic filtering across territories.” |
| 5 | **Partner & Product Ops** | Distributors + Products modules with filtering, CRUD, detail drawers (`components/distributors/distributors-list.tsx`, `components/products/products-list.tsx`). | Split screen of distributor table and product inventory with status pills. | “Manage every partner profile, SKU, and stock signal with granular filters, quick actions, and shadcn-polished UI.” |
| 6 | **Revenue Execution** | Orders workspace, shipments tracker, import automation (`components/orders/orders-list.tsx`, `components/shipments/shipments-list.tsx`, `app/import/page.tsx`, `hooks/use-import-orders.ts`). | Flow diagram: spreadsheet upload → validation panel → orders list; overlay payment/status badges. | “From bulk Excel imports with idempotent validation to live order and shipment tracking, GrowShip keeps cash, inventory, and logistics aligned.” |
| 7 | **People & Compliance** | Enhanced user management + Supabase invite API + Super Admin ops center (`components/users/enhanced-users-management.tsx`, `app/api/users/invite/route.ts`, `components/super-admin/super-admin-dashboard.tsx`). | Tabbed card showing user filters, invite modal, and super-admin stats. | “Invite, segment, and audit every membership—right up to a super-admin portal that spans all organizations.” |
| 8 | **Call to Action** | Promise of unified supply network + next step. | Hero UI returns with CTA button “Launch Pilot”. | “Ready to graduate from siloed systems? Launch your GrowShip pilot and give every partner a single source of truth.” |

## Voiceover & Script Beats
- **00:00–00:08** – Impactful hook, percussive hit, mention “Ship growth, not spreadsheets.”
- **00:08–00:25** – Multi-role access narrative; highlight instant demo access and redirects to `/auth/brand`, `/auth/distributor`, `/auth/manufacturer`.
- **00:25–00:45** – Security + onboarding; call out pending vs approved flows (ProtectedPage + `PendingUserWarning`).
- **00:45–01:05** – Dashboard KPIs + workflow search; cite actual figures for credibility.
- **01:05–01:35** – Deep workflow montage (partners, products, orders, shipments, importer).
- **01:35–01:50** – Governance + invitations + super admin oversight.
- **01:50–02:00** – CTA + future-facing line (“Grow faster with every shipment”).

## Feature Proof Points (cite for authenticity)
- **Landing & Conversion** – `components/landing/landing-page.tsx`, `hero-section.tsx`, `demo-access-section.tsx`: multi-portal CTAs + demo enablement.
- **Role-Based Guardrails** – `contexts/enhanced-auth-context.tsx`, `components/common/protected-page.tsx`, `components/layout/sidebar.tsx`: Supabase auth, organization switching, pending locks.
- **Dashboard Metrics** – `app/dashboard/dashboard-content.tsx`, `components/dashboard/metrics-cards.tsx`: KPI data + search/filter UI.
- **Distributor CRM** – `components/distributors/distributors-list.tsx` + `hooks/use-distributors.ts`: search, status filters, dialogs for CRUD.
- **Product Catalog** – `components/products/products-list.tsx`, `product-form-dialog.tsx`: SKU filtering, pricing display, inventory state colors.
- **Order Lifecycle** – `components/orders/orders-list.tsx`, `hooks/use-orders.ts`: React Query pipeline, payment + fulfillment status badges, edit/delete flows.
- **Shipment Tracking** – `components/shipments/shipments-list.tsx`, `hooks/use-shipments.ts`: carrier, tracking, status updates.
- **Data Import Automation** – `app/import/page.tsx`, `hooks/use-import-orders.ts`: multi-step wizard, `generateFileHashFromFile` for idempotency, validation + summary panels.
- **User & Org Control** – `components/users/enhanced-users-management.tsx`, `app/api/users/invite/route.ts`, `components/super-admin/super-admin-dashboard.tsx`: Supabase invites, exports, organization stats.
- **Tech Stack Credibility** – `README.md`, `Project-Research-Files/agent.MD`: Next.js 15, Supabase, shadcn/ui, Tailwind 4, TanStack Query, Recharts, XLSX importer.

## Visual & Motion Suggestions
- Use screen recordings of live modules; blur sensitive IDs.
- Employ parallax scroll + kinetic typography for KPI numbers.
- For importer, animate spreadsheet rows morphing into GrowShip order cards with a glowing validation check.
- Map lines or pin-drop animation when highlighting distributors/shipments.

## CTA & Copy Bank
- Headline options: “Command Every Channel with GrowShip”, “One Portal. All Partners.”
- CTA button copy: “Book a Pilot,” “Schedule a Supply-Chain Jam Session.”
- Supporting line: “Supabase-secured, Next.js-fast, and tailored for modern brand ecosystems.”

## Production Notes for Companion AI
- Keep narration synced to slide order; annotate each script block with `[Slide X | mm:ss]`.
- Whenever referencing data, flash numeric supers (e.g., “+14.5% Avg Growth”) to match dashboard seeds.
- Close video with logo lockup + URL slug placeholder (e.g., growship.io/demo).
- Export final mix with -3 dB headroom; deliver separate SRT captions pulled from the script text.
