/**
 * Script to assign menu permissions to roles
 * Run this after add-menu-entries.ts
 * 
 * Usage:
 * npx tsx scripts/assign-menu-permissions.ts
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

interface Permission {
  role_name: string;
  menu_path: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

const permissions: Permission[] = [
  // Super Admin - Full access to everything
  { role_name: 'super_admin', menu_path: '/orders', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/purchase-orders', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/shipments', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/invoices', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/reports', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/financials', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/marketing', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/calendar', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/notifications', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/distributors', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/manufacturers', can_view: true, can_edit: true, can_delete: true, can_approve: true },
  { role_name: 'super_admin', menu_path: '/products', can_view: true, can_edit: true, can_delete: true, can_approve: true },

  // Brand Admin
  { role_name: 'brand_admin', menu_path: '/orders', can_view: true, can_edit: true, can_delete: false, can_approve: true },
  { role_name: 'brand_admin', menu_path: '/purchase-orders', can_view: true, can_edit: true, can_delete: false, can_approve: true },
  { role_name: 'brand_admin', menu_path: '/shipments', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/invoices', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/reports', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/financials', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/marketing', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/calendar', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/notifications', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/distributors', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'brand_admin', menu_path: '/products', can_view: true, can_edit: true, can_delete: true, can_approve: false },

  // Distributor Admin
  { role_name: 'distributor_admin', menu_path: '/orders', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'distributor_admin', menu_path: '/shipments', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'distributor_admin', menu_path: '/invoices', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'distributor_admin', menu_path: '/reports', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'distributor_admin', menu_path: '/financials', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'distributor_admin', menu_path: '/calendar', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'distributor_admin', menu_path: '/notifications', can_view: true, can_edit: false, can_delete: false, can_approve: false },

  // Manufacturer Admin
  { role_name: 'manufacturer_admin', menu_path: '/orders', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/purchase-orders', can_view: true, can_edit: true, can_delete: false, can_approve: true },
  { role_name: 'manufacturer_admin', menu_path: '/shipments', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/invoices', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/reports', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/financials', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/calendar', can_view: true, can_edit: true, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/notifications', can_view: true, can_edit: false, can_delete: false, can_approve: false },
  { role_name: 'manufacturer_admin', menu_path: '/products', can_view: true, can_edit: true, can_delete: true, can_approve: false },
];

async function assignPermissions() {
  try {
    console.log('Fetching roles and menus...');

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, role_name')
      .eq('is_active', true);

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw rolesError;
    }

    if (!roles || roles.length === 0) {
      console.error('No roles found in database');
      return;
    }

    // Get all menus
    const { data: menus, error: menusError } = await supabase
      .from('sidebar_menus')
      .select('id, route_path')
      .eq('is_active', true);

    if (menusError) {
      console.error('Error fetching menus:', menusError);
      throw menusError;
    }

    if (!menus || menus.length === 0) {
      console.error('No menus found in database. Run add-menu-entries.ts first.');
      return;
    }

    const roleMap = new Map(roles.map(r => [r.role_name, r.id]));
    const menuMap = new Map(menus.map(m => [m.route_path, m.id]));

    console.log(`\nFound ${roles.length} roles and ${menus.length} menus`);

    // Check existing permissions
    const { data: existingPerms, error: permsError } = await supabase
      .from('role_menu_permissions')
      .select('role_id, menu_id');

    if (permsError) {
      console.error('Error fetching existing permissions:', permsError);
      throw permsError;
    }

    const existingPermsSet = new Set(
      existingPerms?.map(p => `${p.role_id}-${p.menu_id}`) || []
    );

    const permissionsToInsert = [];

    for (const perm of permissions) {
      const roleId = roleMap.get(perm.role_name);
      const menuId = menuMap.get(perm.menu_path);

      if (!roleId) {
        console.warn(`Role not found: ${perm.role_name}`);
        continue;
      }

      if (!menuId) {
        console.warn(`Menu not found: ${perm.menu_path}`);
        continue;
      }

      const key = `${roleId}-${menuId}`;
      if (existingPermsSet.has(key)) {
        continue; // Skip if permission already exists
      }

      permissionsToInsert.push({
        role_id: roleId,
        menu_id: menuId,
        can_view: perm.can_view,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
        can_approve: perm.can_approve,
      });
    }

    if (permissionsToInsert.length === 0) {
      console.log('\nAll permissions already exist. No changes needed.');
      return;
    }

    console.log(`\nInserting ${permissionsToInsert.length} permissions...`);

    const { data, error } = await supabase
      .from('role_menu_permissions')
      .insert(permissionsToInsert)
      .select();

    if (error) {
      console.error('Error inserting permissions:', error);
      throw error;
    }

    console.log(`\n? Successfully assigned ${data?.length || 0} permissions`);
    
    // Group by role for summary
    const byRole = new Map<string, number>();
    for (const perm of permissionsToInsert) {
      const roleName = roles.find(r => r.id === perm.role_id)?.role_name || 'Unknown';
      byRole.set(roleName, (byRole.get(roleName) || 0) + 1);
    }

    console.log('\nPermissions summary by role:');
    byRole.forEach((count, role) => {
      console.log(`  - ${role}: ${count} permissions`);
    });

    console.log('\n? Permission assignment completed!');
  } catch (error) {
    console.error('Failed to assign permissions:', error);
    process.exit(1);
  }
}

assignPermissions();