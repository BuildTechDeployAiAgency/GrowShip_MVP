# 🚢 GrowShip - Multi-Tenant Business Platform

A comprehensive SaaS platform connecting brands, distributors, and manufacturers in a unified supply chain management system.

## ✨ Features

- 🔐 **Multi-Role Authentication** - Brand, Distributor, and Manufacturer portals
- 👥 **Role-Based Access Control** - Granular permissions for different user types
- 📊 **Sales Analytics** - Real-time dashboards and reporting
- 👤 **User Management** - Invite, manage, and organize team members
- 🎨 **Modern UI** - Beautiful, responsive interface built with Tailwind CSS
- 🔄 **Real-time Updates** - Live data synchronization with Supabase
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🌐 **Multi-Tenant** - Organization-based data isolation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or bun package manager
- Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd GrowShip
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Set up Supabase database**

   - See [SETUP.md](./SETUP.md) for detailed database setup
   - See [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md) for step-by-step guide

5. **Run development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[agent.MD](./agent.MD)** - Comprehensive architecture and code reference for AI agents and developers
- **[SETUP.md](./SETUP.md)** - Detailed setup and configuration guide
- **[SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md)** - Step-by-step setup checklist
- **[SECURITY-NOTES.md](./SECURITY-NOTES.md)** - Security best practices and known issues

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack React Query v5
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **File Processing**: XLSX, Mammoth, React PDF

## 🎭 User Roles

### Brand

Manage products, inventory, sales data, and relationships with distributors and manufacturers.

### Distributor

Handle retailer relationships, distribution logistics, and order management.

### Manufacturer

Production scheduling, fulfillment tracking, and supplier coordination.

### Super Admin

Global platform management, user administration, and system configuration.

## 📁 Project Structure

```
/app              # Next.js app directory
  /api           # API routes
  /auth          # Authentication pages
  /dashboard     # Main dashboard
  /sales         # Sales analytics
  /users         # User management
/components      # React components
  /auth          # Auth UI
  /layout        # Layout components
  /ui            # Reusable UI components
/contexts        # React contexts
/hooks           # Custom React hooks
/lib             # Utilities and helpers
  /supabase      # Supabase clients
/types           # TypeScript types
```

## 🛠️ Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

## 🔐 Security

- Row Level Security (RLS) on all database tables
- Environment-based configuration
- Role-based access control
- Session management with Supabase Auth

⚠️ **Note**: This project has a known security vulnerability in the `xlsx` package. See [SECURITY-NOTES.md](./SECURITY-NOTES.md) for details and mitigation strategies.

## 🧪 Testing

To verify everything is working:

1. Sign up with brand/distributor/manufacturer role
2. Complete profile setup
3. Navigate to dashboard
4. Check that sidebar menu appears
5. Test navigation between pages
6. Verify user management features

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Add environment variables in Vercel dashboard
4. Update Supabase redirect URLs

See [deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more options.

## 📝 Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Your Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=       # Your Supabase service role key
NEXT_PUBLIC_APP_URL=             # Your app URL (e.g., http://localhost:3000)
```

## 🤝 Contributing

This is a private business application. For questions or support, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For setup issues, see:

- [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md) - Step-by-step troubleshooting
- [agent.MD](./agent.MD) - Detailed technical documentation

---

**Version**: 0.1.0  
**Last Updated**: October 27, 2025  
**Built with**: Next.js, Supabase, TypeScript, and Tailwind CSS
