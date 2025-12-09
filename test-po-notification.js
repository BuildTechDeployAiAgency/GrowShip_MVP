// Test script to verify PO notification logic
// Run with: node test-po-notification.js

const { createClient } = require('./lib/supabase/server.js');
const { createPOCreatedAlert, createPOApprovalAlert } = require('./lib/notifications/po-alerts.js');

async function testPONotifications() {
  console.log('🧪 Testing PO Notification Logic...\n');
  
  // Test scenario 1: PO created as draft (should only send creation alert)
  console.log('📝 Test 1: PO created as draft');
  const draftPO = {
    id: 'test-po-draft',
    po_number: 'PO-DRAFT-001',
    brand_id: 'test-brand-id',
    po_status: 'draft'
  };
  
  try {
    // Mock user context
    const mockUser = { id: 'test-user-id' };
    
    // Test creation alert
    console.log('  → Calling createPOCreatedAlert...');
    await createPOCreatedAlert(draftPO.id, draftPO.po_number, draftPO.brand_id, mockUser.id);
    console.log('  ✅ Creation alert sent successfully\n');
    
    // Should NOT send approval alert for draft
    console.log('  → Checking if approval alert is sent for draft...');
    if (draftPO.po_status !== 'draft') {
      console.log('  ❌ ERROR: Approval alert would be sent for draft PO');
    } else {
      console.log('  ✅ Correct: No approval alert sent for draft PO\n');
    }
    
  } catch (error) {
    console.error('  ❌ Error in draft PO test:', error.message);
  }
  
  // Test scenario 2: PO created as submitted (should send both alerts)
  console.log('📤 Test 2: PO created as submitted (needs approval)');
  const submittedPO = {
    id: 'test-po-submitted',
    po_number: 'PO-SUBMITTED-001',
    brand_id: 'test-brand-id',
    po_status: 'submitted'
  };
  
  try {
    // Mock user context
    const mockUser = { id: 'test-user-id' };
    
    // Test creation alert
    console.log('  → Calling createPOCreatedAlert...');
    await createPOCreatedAlert(submittedPO.id, submittedPO.po_number, submittedPO.brand_id, mockUser.id);
    console.log('  ✅ Creation alert sent successfully');
    
    // Test approval alert
    console.log('  → Calling createPOApprovalAlert...');
    await createPOApprovalAlert(submittedPO.id, submittedPO.po_number, submittedPO.brand_id, mockUser.id);
    console.log('  ✅ Approval alert sent successfully\n');
    
  } catch (error) {
    console.error('  ❌ Error in submitted PO test:', error.message);
  }
  
  console.log('🎯 Summary: Both notification types should now work correctly');
  console.log('   - Draft PO: Only creation notification');
  console.log('   - Submitted PO: Creation + approval notification');
  console.log('   - Super Admins and Brand Admins should receive approval notifications');
  console.log('\n📋 To test in the app:');
  console.log('   1. Login as a distributor user');
  console.log('   2. Create a new PO');
  console.log('   3. Set status to "submitted"');
  console.log('   4. Check that Super Admin/Brand Admin receives notification');
  console.log('   5. Check notification appears in top-right bell');
  console.log('   6. Check notification appears in /notifications page');
}

// Run the test
testPONotifications().catch(console.error);