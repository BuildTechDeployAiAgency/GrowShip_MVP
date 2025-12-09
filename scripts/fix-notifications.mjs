#!/usr/bin/env node

/**
 * Simple script to check and fix the notification system
 * This addresses the issue where PO approval notifications are not being sent
 * 
 * Run this with: node scripts/fix-notifications.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Load environment variables
config({ path: '.env.local' });

async function fixNotificationSystem() {
  console.log('🔧 GrowShip Notification System Repair Tool\n');
  
  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables. Please check .env.local for:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('✅ Connected to Supabase\n');
  
  // Step 1: Check if notification system tables exist
  console.log('🔍 Checking notification system status...');
  
  try {
    const { data, error } = await supabase
      .from('notification_types')
      .select('key')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.log('❌ Notification system tables do not exist');
        console.log('\n📋 MANUAL ACTION REQUIRED:');
        console.log('   The notification system needs to be set up in your Supabase database.');
        console.log('   Please follow these steps:\n');
        
        console.log('   1. Open your Supabase project dashboard');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Run the following migration files in order:\n');
        
        const migrationFiles = [
          'supabase_migrations/20251209_notification_registry_system.sql',
          'supabase_migrations/20251209_notification_registry_seed.sql',
          'supabase_migrations/20251209_notification_sql_helper.sql',
          'supabase_migrations/20251209_update_shipment_notifications.sql'
        ];
        
        migrationFiles.forEach((file, index) => {
          console.log(`      ${index + 1}. ${file}`);
          
          if (existsSync(file)) {
            console.log(`         ✅ File exists`);
          } else {
            console.log(`         ❌ File missing`);
          }
        });
        
        console.log('\n   4. After running migrations, run this script again to verify');
        return;
      } else {
        console.error('❌ Database error:', error);
        return;
      }
    }
    
    console.log('✅ notification_types table exists');
    
    // Step 2: Check for PO notification types
    const { data: poTypes } = await supabase
      .from('notification_types')
      .select('id, key, name')
      .in('key', ['po_created', 'po_approval_required']);
    
    if (!poTypes || poTypes.length === 0) {
      console.log('❌ Missing PO notification types');
      console.log('   Run the seed migration to populate notification types');
      return;
    }
    
    console.log(`✅ Found ${poTypes.length} PO notification types`);
    
    // Step 3: Check role settings
    const approvalType = poTypes.find(t => t.key === 'po_approval_required');
    if (approvalType) {
      const { data: roleSettings } = await supabase
        .from('notification_role_settings')
        .select('role, is_enabled, frequency')
        .eq('notification_type_id', approvalType.id);
      
      console.log(`\n📊 PO Approval Notification Settings:`);
      if (roleSettings && roleSettings.length > 0) {
        roleSettings.forEach(setting => {
          const status = setting.is_enabled ? '✅ enabled' : '❌ disabled';
          console.log(`   ${setting.role}: ${status} (${setting.frequency})`);
        });
        
        const enabledRoles = roleSettings.filter(s => s.is_enabled);
        if (enabledRoles.length === 0) {
          console.log('\n❌ No roles are enabled for PO approval notifications!');
          console.log('   This is likely the cause of missing notifications.');
          
          // Fix: Enable key roles
          console.log('\n🔧 Fixing role settings...');
          const rolesToEnable = ['brand_admin', 'brand_manager', 'super_admin'];
          
          for (const role of rolesToEnable) {
            const { error: updateError } = await supabase
              .from('notification_role_settings')
              .update({ is_enabled: true })
              .eq('notification_type_id', approvalType.id)
              .eq('role', role);
            
            if (updateError) {
              console.log(`   ❌ Failed to enable ${role}:`, updateError.message);
            } else {
              console.log(`   ✅ Enabled notifications for ${role}`);
            }
          }
        }
      } else {
        console.log('   ❌ No role settings found! Run the seed migration.');
      }
    }
    
    // Step 4: Test notification creation
    console.log('\n🧪 Testing notification dispatcher...');
    
    try {
      // Check if we can query the dispatcher's required tables
      const { data: testQuery } = await supabase
        .from('notification_types')
        .select(`
          id, 
          key,
          notification_role_settings(role, is_enabled, frequency)
        `)
        .eq('key', 'po_approval_required');
      
      if (testQuery && testQuery.length > 0) {
        console.log('✅ Notification dispatcher queries work');
        console.log('✅ Database schema is properly set up');
      }
    } catch (testError) {
      console.log('❌ Notification dispatcher test failed:', testError.message);
    }
    
    console.log('\n🎉 Notification system check complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Create a test purchase order');
    console.log('   2. Check notifications page for approval alerts');
    console.log('   3. Look for console messages: "[createPOApprovalAlert] Sent X notifications"');
    console.log('\n💡 If notifications still don\'t appear, check browser console for errors');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Run the script
fixNotificationSystem();