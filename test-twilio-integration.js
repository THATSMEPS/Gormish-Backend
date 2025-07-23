const twilioSMSService = require('./src/services/twilioSMSService');
require('dotenv').config();

/**
 * Simple test script to verify Twilio integration
 * Run this after setting up your TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER
 */

async function testTwilioIntegration() {
  try {
    console.log('🧪 Testing Twilio SMS Service...\n');

    // Test phone number formatting
    console.log('📱 Testing phone number formatting:');
    const testNumbers = ['9876543210', '+919876543210', '919876543210'];
    testNumbers.forEach(number => {
      const formatted = twilioSMSService.formatPhoneNumber(number);
      console.log(`   ${number} → ${formatted}`);
    });

    console.log('\n📞 Testing phone number validation:');
    testNumbers.forEach(number => {
      const isValid = twilioSMSService.isValidPhoneNumber(number);
      console.log(`   ${number} → ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });

    // If you want to test actual SMS sending (uncomment and add a real phone number)
    // WARNING: This will send a real SMS and may incur charges
    /*
    console.log('\n📤 Testing OTP sending:');
    const testPhone = '+91XXXXXXXXXX'; // Replace with your actual phone number
    const testOTP = '123456';
    
    const result = await twilioSMSService.sendOTP(testPhone, testOTP);
    console.log('   Result:', result);
    */

    console.log('\n✅ Twilio integration test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Get your Auth Token from Twilio Console');
    console.log('   2. Get your Twilio Phone Number');
    console.log('   3. Update your .env file with these values');
    console.log('   4. Test the API endpoints: /api/auth/send-phone-otp and /api/auth/verify-phone-otp');

  } catch (error) {
    console.error('❌ Twilio integration test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure TWILIO_AUTH_TOKEN is set in your .env file');
    console.log('   - Make sure TWILIO_PHONE_NUMBER is set in your .env file');
    console.log('   - Verify your Twilio account credentials');
  }
}

// Run the test
testTwilioIntegration();
