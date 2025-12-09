#!/usr/bin/env node

/**
 * Check current notification_type enum values
 */

const { createClient } = require('@supabase/supabase-js');

async function checkCurrentEnum() {
  console.log('🔍 Checking current notification_type enum values\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Get current enum values by testing each known type
    const knownTypes = [
      'po_approval_required',
      'po_created',
      'po_approved', 
      'low_stock_alert',
      'order_created',
      'shipment_delivered',
      'payment_due',
      'user_invite',
      'generic_notification'
    ];
    
    console.log('🧪 Testing each notification type by attempting to create test records...\n');
    
    for (const type of knownTypes) {
      try {
        // Try to create a test notification with this type
        const { data, error } = await supabase
          .from('notifications')
          .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID, will fail but tells us about enum
            type: type,
            title: 'Test',
            message: 'Test',
            is_read: false
          })
          .select();
        
        if (error) {
          if (error.message.includes('invalid input value for enum')) {
            console.log(`❌ ${type} - NOT in enum`);
          } else {
            console.log(`✅ ${type} - IN enum (error: ${error.message.substring(0, 50)}...)`);
          }
        } else {
          console.log(`✅ ${type} - IN enum and created successfully`);
        }
      } catch (err) {
        console.log(`❓ ${type} - Error testing: ${err.message}`);
      }
    }
    
    console.log('\n📋 Based on the notification_types table, these should be valid:');
    const { data: typeData } = await supabase
      .from('notification_types')
      .select('key')
      .eq('is_active', true)
      .order('key');
    
    if (typeData) {
      typeData.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.key}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkCurrentEnum().catch(console.error);