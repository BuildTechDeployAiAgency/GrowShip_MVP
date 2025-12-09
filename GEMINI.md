# GEMINI.md - GrowShip Project

This document provides a comprehensive overview of the GrowShip project for AI agents and developers.

## Project Overview

GrowShip is a multi-tenant SaaS platform designed to connect brands, distributors, and manufacturers in a unified supply chain management system. It provides role-based access control, sales analytics, user management, and real-time data synchronization.

The frontend is built with Next.js (App Router) and TypeScript, using Tailwind CSS for styling and `shadcn/ui` for components. The backend is powered by Supabase, which provides the database, authentication, and storage.

The project also includes a Python backend in the `Backend/` directory. This is a FastAPI application that provides intelligent data extraction from Excel/CSV files using OpenAI's GPT-4 model for automatic column mapping and Supabase for data storage.

## Building and Running

### Prerequisites

- Node.js 18+
- npm or bun package manager
- Supabase account

### Installation

1.  **Clone the repository**

    ```bash
    git clone <repository-url>
    cd GrowShip
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Set up environment variables**

    ```bash
    cp env.example .env.local
    ```

    Edit `.env.local` and add your Supabase credentials:

    -   `NEXT_PUBLIC_SUPABASE_URL`
    -   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    -   `SUPABASE_SERVICE_ROLE_KEY`

4.  **Set up Supabase database**

    -   See `SETUP.md` for detailed database setup.

### Running the Application

-   **Development:** `npm run dev`
-   **Production Build:** `npm run build`
-   **Start Production Server:** `npm run start`

## Testing

The `README.md` file provides a basic manual testing guide:

1.  Sign up with a brand/distributor/manufacturer role.
2.  Complete the profile setup.
3.  Navigate to the dashboard.
4.  Check that the sidebar menu appears.
5.  Test navigation between pages.
6.  Verify user management features.

There are no automated tests configured in the project.

## Authentication and Authorization

Authentication is handled by Supabase Auth, which supports email/password, OAuth, and magic links. The frontend uses a custom `AuthContext` to manage user sessions and provide user data to the application.

Authorization is implemented using role-based access control (RBAC). User roles are stored in the `user_profiles` table and are used to control access to different parts of the application. The database uses Row Level Security (RLS) to enforce data access policies at the database level.

## Environment Variables

### Frontend

-   `NEXT_PUBLIC_SUPABASE_URL`: The URL of the Supabase project.
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for the Supabase project.
-   `SUPABASE_SERVICE_ROLE_KEY`: The service role key for the Supabase project.

### Backend

-   `OPENAI_API_KEY`: The API key for the OpenAI service.
-   `SUPABASE_URL`: The URL of the Supabase project.
-   `SUPABASE_ANON_KEY`: The anonymous key for the Supabase project.

## Project Dependencies

### Frontend

-   **Framework:** Next.js
-   **Language:** TypeScript
-   **UI:** React, Tailwind CSS, shadcn/ui, Radix UI
-   **State Management:** TanStack React Query
-   **Forms:** React Hook Form, Zod
-   **API:** Supabase Client

### Backend

-   **Framework:** FastAPI
-   **Language:** Python
-   **API:** Uvicorn
-   **Data Processing:** Pandas
-   **AI:** OpenAI
-   **Database:** Supabase

## Available Scripts

-   `npm run dev`: Starts the development server.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.

## Development Conventions

-   **Styling:** The project uses Tailwind CSS with `tailwind-merge` and `clsx` for utility class management.
-   **Components:** Reusable UI components are built with `shadcn/ui` and Radix UI.
-   **State Management:** Asynchronous state is managed with TanStack React Query (`@tanstack/react-query`).
-   **Forms:** Forms are handled with `react-hook-form` and Zod for validation.
-   **Authentication:** Authentication is handled by Supabase Auth, with a custom `AuthContext` to manage user sessions.
-   **Linting and Formatting:** The project is configured with TypeScript and likely uses Prettier and ESLint (though not explicitly configured in `package.json`).

## Database Schema

The database schema is managed through SQL migration files located in the `supabase/migrations` directory. The following tables are part of the notification system:

-   `notification_types`: A registry of all system notification types, including their keys, names, categories, and default settings.
-   `notification_role_settings`: Defines per-role configurations for each notification type, such as whether it's enabled, the delivery frequency, and the channels to use.
-   `notification_digests`: A queue for notifications that are to be sent as digests (e.g., hourly, daily).

Other tables exist in the database, but their schema is not detailed in the provided migration files.

## Key Files and Directories

-   `app/`: The main application directory for the Next.js app router.
-   `components/`: Contains all React components, organized by feature.
-   `contexts/`: Holds React contexts, such as `AuthContext`.
-   `hooks/`: Contains custom React hooks for data fetching and other logic.
-   `lib/`: Includes utility functions, API helpers, and the Supabase client.
-   `Backend/`: Contains a Python backend with its own `requirements.txt`. The backend uses FastAPI, Pandas, OpenAI, and Supabase.
-   `supabase/`: Contains Supabase-related scripts and configurations, including database migrations.
-   `README.md`: Provides a good overview of the project.
-   `package.json`: Defines project dependencies and scripts.
-   `next.config.ts`: Configuration file for the Next.js application.
-   `tsconfig.json`: TypeScript configuration file.

## Frontend Components

The `components/` directory is organized by feature:

-   `auth/`: Components related to authentication (login, signup, etc.).
-   `calendar/`: Components for the calendar feature.
-   `common/`: Common components used across the application.
-   `customers/`: Components for managing customers.
-   `dashboard/`: Components for the main dashboard.
-   `demo/`: Components for the demo version of the application.
-   `distributors/`: Components for managing distributors.
-   `forecasting/`: Components for the forecasting feature.
-   `import/`: Components for importing data.
-   `inventory/`: Components for managing inventory.
-   `invoices/`: Components for managing invoices.
-   `landing/`: Components for the landing page.
-   `layout/`: Components for the application layout (header, sidebar, etc.).
-   `manufacturers/`: Components for managing manufacturers.
-   `notifications/`: Components for the notification center.
-   `orders/`: Components for managing orders.
-   `products/`: Components for managing products.
-   `purchase-orders/`: Components for managing purchase orders.
-   `reports/`: Components for generating reports.
-   `sales/`: Components for sales analytics.
-   `settings/`: Components for user and application settings.
-   `shipments/`: Components for managing shipments.
-   `super-admin/`: Components for the super admin dashboard.
-   `targets/`: Components for managing sales targets.
-   `ui/`: Reusable UI components (buttons, inputs, etc.).
-   `users/`: Components for managing users.

## Backend API Endpoints

The Python backend provides the following API endpoints:

-   `POST /api/v1/excel/upload`: Upload Excel/CSV file and get sheet names.
-   `POST /api/v1/excel/upload-and-process`: Upload file, process with AI, and store to Supabase.
-   `DELETE /api/v1/excel/document/{document_id}`: Delete document and associated data.
-   `GET /api/v1/excel/sheets/{filename}`: Get all sheet names from uploaded file.
-   `GET /api/v1/excel/data/{filename}/{sheet_name}`: Get raw data with pagination.
-   `POST /api/v1/excel/data/{filename}/{sheet_name}/filter`: Filter data with conditions.
-   `GET /api/v1/excel/stats/{filename}`: Get file statistics for all sheets.
-   `POST /api/v1/excel/map-columns/{filename}`: Map columns using OpenAI.
-   `GET /api/v1/excel/mapped-data/{filename}`: Get mapped data with pagination.
-   `GET /api/v1/excel/mapped-data-summary/{filename}`: Get summary statistics for mapped data.
-   `GET /api/v1/excel/detect-best-sheet/{filename}`: Auto-detect best sheet for analysis.
-   `GET /api/v1/excel/debug/{filename}`: Debug file structure and data.
-   `GET /api/v1/excel/data/{organization_id}/{user_id}`: Get user's sales data (paginated).
-   `GET /api/v1/excel/admin/data/{organization_id}`: Get all organization data (admin view).
-   `GET /api/v1/excel/business-questions/top-products`: Top products by sales.
-   `GET /api/v1/excel/business-questions/sales-by-country`: Sales aggregated by country.
-   `GET /api/v1/excel/business-questions/monthly-trend`: Monthly sales trends.
-   `GET /api/v1/excel/business-questions/category-performance`: Category performance metrics.
