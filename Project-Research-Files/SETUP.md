# GrowShip Multi-Tenant SaaS Setup Guide

## 🚀 Overview

This guide will help you set up the GrowShip multi-tenant business platform with Supabase authentication and Google OAuth integration.

## 📋 Prerequisites

- Node.js 18+
- Bun package manager
- Supabase account
- Google Cloud Platform account

## 🏗️ Multi-Tenant Architecture

The platform supports three main user roles:

- **Brand Owners** (Sarah from PureBorn) - Manage products, inventory, sales
- **Distributors** (Mike from BabyWorld) - Handle retailer relationships and distribution
- **Manufacturers** (David from EcoFabrics) - Production and fulfillment

## 🔧 Setup Instructions

### 1. Environment Setup

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Enable Google OAuth in Authentication > Providers
4. Add your Google OAuth credentials
5. Set redirect URL to: `http://localhost:3000/auth/callback`

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

### 4. Install Dependencies

```bash
bun install
```

### 5. Run Development Server

```bash
bun dev
```

Visit `http://localhost:3000` to see your application!

## 🗄️ Database Features

### Multi-Tenant Data Isolation

- Row Level Security (RLS) policies ensure data isolation between organizations
- Organization-based access control for all business data
- Automatic organization membership management

### Business Data Models

- **Organizations**: Tenant containers with settings and subscription tiers
- **Products**: SKU management, pricing, specifications
- **Inventory**: Multi-location stock tracking
- **Purchase Orders**: Supplier management and production coordination
- **Sales Data**: Multi-channel sales tracking from various retail platforms

### Role-Based Access Control

- **Owner**: Full organization control
- **Admin**: Management privileges
- **Brand Owner**: Product and inventory management
- **Distributor**: Order and relationship management
- **Manufacturer**: Production and fulfillment tracking
- **Viewer**: Read-only access

## 🔐 Authentication Flow

1. **User clicks "Continue with Google"**
2. **Redirected to Google OAuth**
3. **Returns to `/auth/callback`**
4. **Session established with Supabase**
5. **User profile created/updated**
6. **Organization memberships loaded**
7. **Current organization selected**
8. **Redirect to dashboard**

## 🏢 Organization Management

### Creating Organizations

- New users can create organizations
- Automatically become organization owner
- Organization slug for subdomain routing
- Subscription tier management

### Multi-Organization Support

- Users can belong to multiple organizations
- Organization switcher in header
- Persistent organization selection
- Role-based permissions per organization

## 📱 Responsive Design

The platform includes:

- Modern, clean UI with Tailwind CSS
- Mobile-responsive design
- Accessible components
- Professional business interface

## 🧪 Development Tools

- **TanStack React Query**: Efficient data fetching and caching
- **React Query DevTools**: Development debugging
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling

## 🔍 Key Features Implemented

✅ **Authentication & Authorization**

- Google OAuth integration
- Multi-tenant user management
- Role-based access control
- Session persistence

✅ **Organization Management**

- Create and manage organizations
- Organization switching
- Member invitations
- Subscription tiers

✅ **Data Architecture**

- Comprehensive database schema
- RLS security policies
- Multi-tenant data isolation
- Business entity relationships

✅ **UI Components**

- Login/authentication flow
- Organization switcher
- Protected route wrapper
- Responsive layout

✅ **State Management**

- React Query for server state
- Context API for authentication
- Organization context
- Optimistic updates

## 🚀 Ready-to-Build Features

The foundation is ready for implementing:

- Product management
- Inventory tracking
- Purchase order workflows
- Sales data upload and analytics
- Multi-channel reporting
- Business collaboration tools

## 🎯 Business Workflow Examples

### Brand Owner Daily Flow

1. Upload sales reports from retailers
2. Monitor inventory levels across warehouses
3. Create purchase orders for low-stock items
4. Review sales analytics and forecasts
5. Coordinate with distributors

### Distributor Workflow

1. Receive new product listings
2. Place orders with brand owners
3. Track shipments and deliveries
4. Manage retailer relationships
5. Monitor payment schedules

### Manufacturer Operations

1. Receive production orders
2. Update production schedules
3. Track material requirements
4. Coordinate logistics and shipping
5. Provide delivery updates

This platform transforms how brands, distributors, and manufacturers collaborate, providing real-time visibility and streamlined operations across the entire supply chain.
