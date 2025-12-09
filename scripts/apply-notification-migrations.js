#!/usr/bin/env node

/**
 * Script to apply notification system database migrations
 * This fixes the issue where PO approval notifications are not being sent
 * 
 * Run this script with: node scripts/apply-notification-migrations.js
 */

const fs = require('fs');
const path = require('path');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

async function applyNotificationMigrations() {
  console.log('🚀 Starting Notification System Migration...\n');
  
  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease check your .env.local file');
    process.exit(1);
  }
  
  // Create admin client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('✅ Connected to Supabase');
  
  // List of migrations to apply in order
  const migrations = [
    {
      name: 'Notification Registry System',
      file: 'supabase_migrations/20251209_notification_registry_system.sql'
    },
    {
      name: 'Notification Registry Seed',
      file: 'supabase_migrations/20251209_notification_registry_seed.sql'
    },
    {
      name: 'Notification SQL Helper',
      file: 'supabase_migrations/20251209_notification_sql_helper.sql'
    },
    {
      name: 'Update Shipment Notifications',
      file: 'supabase_migrations/20251209_update_shipment_notifications.sql'
    }
  ];
  
  for (const migration of migrations) {
    console.log(`\n📁 Applying: ${migration.name}`);
    
    const migrationPath = path.join(process.cwd(), migration.file);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migration.file}`);
      continue;
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    try {
      console.log('   Executing SQL...');
      const result = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (result.error) {
        console.error(`❌ Error in ${migration.name}:`, result.error);
      } else {
        console.log(`✅ ${migration.name} applied successfully`);
      }
    } catch (error) {
      console.error(`❌ Failed to apply ${migration.name}:`, error.message);
      
      // If exec_sql function doesn't exist, try direct query
      console.log('   Trying alternative method...');
      try {
        // Split SQL into individual statements and execute them
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const stmt of statements) {
          if (stmt.trim()) {
            const { error } = await supabase.rpc('sql', { query: stmt });
            if (error) {
              console.error(`❌ SQL Error:`, error);
              break;
            }
          }
        }
        console.log(`✅ ${migration.name} applied successfully (alternative method)`);
      } catch (altError) {
        console.error(`❌ Alternative method also failed:`, altError.message);
        console.log(`\n🔧 Manual Application Required:`);
        console.log(`   Please run the SQL from ${migration.file} manually in your Supabase SQL editor`);
      }
    }
  }
  
  // Verify the migration worked
  console.log('\n🔍 Verifying migration...');
  
  try {
    const { data: notificationTypes, error: typesError } = await supabase
      .from('notification_types')
      .select('key, name')
      .eq('key', 'po_approval_required');
    
    if (typesError) {
      console.error('❌ Error checking notification_types table:', typesError);
    } else if (notificationTypes && notificationTypes.length > 0) {
      console.log('✅ notification_types table exists and has PO approval type');
      
      const { data: roleSettings, error: settingsError } = await supabase
        .from('notification_role_settings')
        .select('role, is_enabled')
        .eq('notification_type_id', notificationTypes[0].id);
      
      if (settingsError) {
        console.error('❌ Error checking notification_role_settings table:', settingsError);
      } else {
        console.log(`✅ Found ${roleSettings?.length || 0} role settings for PO approval notifications`);
        if (roleSettings && roleSettings.length > 0) {
          console.log('   Enabled roles:', roleSettings.filter(rs => rs.is_enabled).map(rs => rs.role).join(', '));
        }
      }
    } else {
      console.log('❌ notification_types table exists but missing PO approval type');
    }
  } catch (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
    console.log('\n🔧 The tables may not exist yet. Please apply the migrations manually.');
  }
  
  console.log('\n🎉 Migration script completed!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Test creating a purchase order');
  console.log('   2. Check if notifications appear for brand_admin and super_admin users');
  console.log('   3. Monitor console logs for notification success messages');
  console.log('\n💡 If notifications still don\'t work, check the browser console for errors');
}

// Run the migration
applyNotificationMigrations().catch(console.error);