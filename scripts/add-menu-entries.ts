/**
 * Script to add menu entries to Supabase database
 * Run this script using Supabase CLI or SQL Editor
 * 
 * Usage:
 * 1. Using Supabase CLI:
 *    supabase db execute --file scripts/add-menu-entries.sql
 * 
 * 2. Using Supabase Dashboard:
 *    - Go to SQL Editor
 *    - Copy and paste the contents of scripts/add-menu-entries.sql
 *    - Execute the script
 * 
 * 3. Then run scripts/assign-menu-permissions.sql to assign permissions
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface MenuEntry {
  menu_label: string;
  menu_icon: string;
  route_path: string;
  menu_order: number;
  is_active: boolean;
  requires_permission: string | null;
}

async function addMenuEntries() {
  try {
    console.log('Fetching existing menus to determine menu_order...');
    
    // Get current max menu_order
    const { data: existingMenus, error: fetchError } = await supabase
      .from('sidebar_menus')
      .select('menu_order')
      .order('menu_order', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing menus:', fetchError);
      throw fetchError;
    }

    const maxOrder = existingMenus && existingMenus.length > 0 ? existingMenus[0].menu_order : 0;
    console.log(`Current max menu_order: ${maxOrder}`);

    const menuEntries: MenuEntry[] = [
      {
        menu_label: 'Orders',
        menu_icon: 'ShoppingCart',
        route_path: '/orders',
        menu_order: maxOrder + 1,
        is_active: true,
        requires_permission: 'can_manage_orders',
      },
      {
        menu_label: 'Purchase Orders',
        menu_icon: 'FileText',
        route_path: '/purchase-orders',
        menu_order: maxOrder + 2,
        is_active: true,
        requires_permission: 'can_manage_orders',
      },
      {
        menu_label: 'Shipments',
        menu_icon: 'Truck',
        route_path: '/shipments',
        menu_order: maxOrder + 3,
        is_active: true,
        requires_permission: 'can_manage_orders',
      },
      {
        menu_label: 'Invoices',
        menu_icon: 'Receipt',
        route_path: '/invoices',
        menu_order: maxOrder + 4,
        is_active: true,
        requires_permission: 'can_view_financials',
      },
      {
        menu_label: 'Reports',
        menu_icon: 'FileText',
        route_path: '/reports',
        menu_order: maxOrder + 5,
        is_active: true,
        requires_permission: null,
      },
      {
        menu_label: 'Financials',
        menu_icon: 'DollarSign',
        route_path: '/financials',
        menu_order: maxOrder + 6,
        is_active: true,
        requires_permission: 'can_view_financials',
      },
      {
        menu_label: 'Marketing',
        menu_icon: 'Megaphone',
        route_path: '/marketing',
        menu_order: maxOrder + 7,
        is_active: true,
        requires_permission: null,
      },
      {
        menu_label: 'Calendar',
        menu_icon: 'Calendar',
        route_path: '/calendar',
        menu_order: maxOrder + 8,
        is_active: true,
        requires_permission: null,
      },
      {
        menu_label: 'Notifications',
        menu_icon: 'Bell',
        route_path: '/notifications',
        menu_order: maxOrder + 9,
        is_active: true,
        requires_permission: null,
      },
      {
        menu_label: 'Distributors',
        menu_icon: 'Building2',
        route_path: '/distributors',
        menu_order: maxOrder + 10,
        is_active: true,
        requires_permission: 'can_manage_organizations',
      },
      {
        menu_label: 'Manufacturers',
        menu_icon: 'Factory',
        route_path: '/manufacturers',
        menu_order: maxOrder + 11,
        is_active: true,
        requires_permission: 'can_manage_organizations',
      },
      {
        menu_label: 'Products',
        menu_icon: 'Package',
        route_path: '/products',
        menu_order: maxOrder + 12,
        is_active: true,
        requires_permission: 'can_manage_products',
      },
    ];

    console.log(`\nInserting ${menuEntries.length} menu entries...`);

    // Check for existing menus first
    const { data: existingRoutes, error: routesError } = await supabase
      .from('sidebar_menus')
      .select('route_path')
      .in('route_path', menuEntries.map(e => e.route_path));

    if (routesError) {
      console.error('Error checking existing routes:', routesError);
      throw routesError;
    }

    const existingRoutesSet = new Set(existingRoutes?.map(r => r.route_path) || []);
    const newEntries = menuEntries.filter(e => !existingRoutesSet.has(e.route_path));

    if (newEntries.length === 0) {
      console.log('All menu entries already exist. Skipping insertion.');
      return;
    }

    console.log(`Found ${existingRoutesSet.size} existing entries, inserting ${newEntries.length} new entries...`);

    const { data, error } = await supabase
      .from('sidebar_menus')
      .insert(newEntries)
      .select();

    if (error) {
      console.error('Error inserting menu entries:', error);
      throw error;
    }

    console.log(`\n? Successfully inserted ${data?.length || 0} menu entries:`);
    data?.forEach((entry) => {
      console.log(`  - ${entry.menu_label} (${entry.route_path})`);
    });

    console.log('\n? Menu entries added successfully!');
    console.log('\nNext step: Run scripts/assign-menu-permissions.ts to assign permissions to roles.');
  } catch (error) {
    console.error('Failed to add menu entries:', error);
    process.exit(1);
  }
}

addMenuEntries();