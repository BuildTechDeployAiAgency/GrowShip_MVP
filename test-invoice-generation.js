/**
 * Test script to verify invoice generation fix
 * This script can be run to test the API endpoint directly
 */

const testInvoiceGeneration = async (orderId, authToken) => {
  try {
    console.log('Testing invoice generation for order:', orderId);
    
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/generate-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS: Invoice generated successfully!');
      console.log('Invoice details:', {
        id: data.id,
        invoice_number: data.invoice_number,
        order_id: data.order_id,
        total_amount: data.total_amount,
        currency: data.currency,
      });
      return true;
    } else {
      console.log('❌ FAILED: Invoice generation failed');
      console.log('Error:', data.error);
      console.log('Status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR: Test failed with exception:', error.message);
    return false;
  }
};

// Test cases to run
const testCases = [
  {
    name: 'Valid completed order',
    orderId: 'your-order-id-here', // Replace with actual order ID
    expectedSuccess: true,
  },
  {
    name: 'Invalid order ID',
    orderId: 'invalid-order-id',
    expectedSuccess: false,
  },
];

// Instructions for running the test
console.log(`
📋 INVOICE GENERATION TEST INSTRUCTIONS

1. Make sure your development server is running (npm run dev)
2. Get a valid auth token from your browser's localStorage:
   - Open browser dev tools (F12)
   - Go to Application/Storage tab
   - Find localStorage for your site
   - Copy the 'supabase.auth.token' value
3. Replace 'your-order-id-here' with an actual order ID from your database
4. Run this script with: node test-invoice-generation.js

Expected results:
- Valid order should create invoice with invoice_number format: INV-1234567890
- Invalid order should return appropriate error message
- No "null value in column invoice_number" errors should occur
`);

// Export for use in other test files
module.exports = { testInvoiceGeneration, testCases };