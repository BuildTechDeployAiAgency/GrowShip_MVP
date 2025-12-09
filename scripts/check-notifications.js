#!/usr/bin/env node

/**
 * Simple notification system checker
 * Run with: node scripts/check-notifications.js
 */

const { createClient } = require('@supabase/supabase-js');

async function checkNotificationSystem() {
  console.log('🔧 GrowShip Notification System Diagnostic\n');
  
  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.log('\nPlease run: source .env.local && node scripts/check-notifications.js');
    return;
  }
  
  // Create admin client (same as notification dispatcher uses)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('✅ Connected to Supabase\n');
  
  try {
    // Test 1: Check if tables exist
    console.log('🔍 Test 1: Checking notification tables...');
    const { data, error } = await supabase
      .from('notification_types')
      .select('key')
      .limit(1);
    
    if (error) {
      console.log('❌ notification_types table does not exist');
      console.log('   Error code:', error.code);
      console.log('   This explains why notifications are not working!\n');
      
      console.log('🔧 SOLUTION: Apply database migrations');
      console.log('   1. Open Supabase dashboard → SQL Editor');
      console.log('   2. Copy and run these files in order:');
      console.log('      - supabase_migrations/20251209_notification_registry_system.sql');
      console.log('      - supabase_migrations/20251209_notification_registry_seed.sql');
      console.log('   3. Run this script again to verify');
      return;
    }
    
    console.log('✅ notification_types table exists');
    
    // Test 2: Check PO notification types
    console.log('\n🔍 Test 2: Checking PO notification types...');
    const { data: poTypes } = await supabase
      .from('notification_types')
      .select('id, key, name')
      .in('key', ['po_approval_required', 'po_created']);
    
    if (!poTypes || poTypes.length === 0) {
      console.log('❌ No PO notification types found');
      console.log('   Run the seed migration to populate types');
      return;
    }
    
    console.log(`✅ Found ${poTypes.length} PO notification types`);
    poTypes.forEach(type => {
      console.log(`   - ${type.key}: ${type.name}`);
    });
    
    // Test 3: Check role settings
    const approvalType = poTypes.find(t => t.key === 'po_approval_required');
    if (approvalType) {
      console.log('\n🔍 Test 3: Checking role permissions...');
      const { data: roleSettings } = await supabase
        .from('notification_role_settings')
        .select('role, is_enabled')
        .eq('notification_type_id', approvalType.id);
      
      if (!roleSettings || roleSettings.length === 0) {
        console.log('❌ No role settings found for PO approval notifications');
        return;
      }
      
      console.log('📊 Role Settings for PO Approval:');
      const enabledRoles = [];
      const disabledRoles = [];
      
      roleSettings.forEach(setting => {
        if (setting.is_enabled) {
          enabledRoles.push(setting.role);
          console.log(`   ✅ ${setting.role}: enabled`);
        } else {
          disabledRoles.push(setting.role);
          console.log(`   ❌ ${setting.role}: disabled`);
        }
      });
      
      // Test 4: Check if critical roles are enabled
      console.log('\n🔍 Test 4: Checking critical roles...');
      const criticalRoles = ['brand_admin', 'super_admin'];
      const missingCriticalRoles = criticalRoles.filter(role => !enabledRoles.includes(role));
      
      if (missingCriticalRoles.length > 0) {
        console.log('❌ Critical roles not enabled for notifications:');
        missingCriticalRoles.forEach(role => {
          console.log(`   - ${role}`);
        });
        
        console.log('\n🔧 Auto-fixing critical role settings...');
        for (const role of missingCriticalRoles) {
          const { error: updateError } = await supabase
            .from('notification_role_settings')
            .update({ is_enabled: true })
            .eq('notification_type_id', approvalType.id)
            .eq('role', role);
          
          if (updateError) {
            console.log(`   ❌ Failed to enable ${role}:`, updateError.message);
          } else {
            console.log(`   ✅ Enabled ${role} for PO approval notifications`);
          }
        }
      } else {
        console.log('✅ Critical roles are properly enabled');
      }
    }
    
    console.log('\n🎉 Diagnostic complete!');
    console.log('\n📋 What to test now:');
    console.log('   1. Create a new purchase order');
    console.log('   2. Check /notifications page');
    console.log('   3. Look for console message: "Sent X notifications for PO..."');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.log('\nThis error suggests the database schema is not properly set up.');
  }
}

checkNotificationSystem().catch(console.error);