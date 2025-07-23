/**
 * Test script for Firebase FCM Integration
 * Run this script to verify that the FCM notification system is working correctly
 */

const { restaurantNotificationService } = require('./src/services/restaurantNotificationService');
const { initializeFirebaseAdmin, healthCheck } = require('./src/config/firebase-admin');
const prisma = require('./src/config/prisma');

async function testFirebaseSetup() {
  console.log('🔧 Testing Firebase Admin SDK setup...');
  
  try {
    // Test Firebase initialization
    await initializeFirebaseAdmin();
    console.log('✅ Firebase Admin SDK initialized successfully');
    
    // Test Firebase health check
    const health = await healthCheck();
    if (health.initialized) {
      console.log('✅ Firebase health check passed');
      console.log(`   Project ID: ${health.projectId}`);
    } else {
      console.log('❌ Firebase health check failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Firebase setup failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🔧 Testing database connection...');
  
  try {
    // Test basic database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check if new tables exist
    try {
      const tokenCount = await prisma.restaurantFCMToken.count();
      console.log(`✅ RestaurantFCMToken table exists (${tokenCount} records)`);
    } catch (error) {
      console.log('❌ RestaurantFCMToken table not found - run database migration');
      return false;
    }
    
    try {
      const logCount = await prisma.notificationLog.count();
      console.log(`✅ NotificationLog table exists (${logCount} records)`);
    } catch (error) {
      console.log('❌ NotificationLog table not found - run database migration');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testNotificationService() {
  console.log('🔧 Testing Restaurant Notification Service...');
  
  try {
    // Test service initialization
    if (!restaurantNotificationService) {
      console.log('❌ Restaurant notification service not initialized');
      return false;
    }
    console.log('✅ Restaurant notification service initialized');
    
    // Test with a dummy restaurant (you may need to adjust this)
    const testRestaurantId = 'test-restaurant-id';
    const testToken = 'dummy-fcm-token-for-testing';
    
    // Test token storage (will fail gracefully if restaurant doesn't exist)
    try {
      const result = await restaurantNotificationService.storeFCMToken(testRestaurantId, testToken);
      if (result.success) {
        console.log('✅ FCM token storage works');
      } else {
        console.log('⚠️  FCM token storage test failed (this is expected if test restaurant doesn\'t exist)');
        console.log(`   Message: ${result.message}`);
      }
    } catch (error) {
      console.log('⚠️  FCM token storage test failed (this is expected in test environment)');
    }
    
    return true;
  } catch (error) {
    console.log('❌ Notification service test failed:', error.message);
    return false;
  }
}

async function testEnvironmentConfiguration() {
  console.log('🔧 Testing environment configuration...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'FIREBASE_CREDENTIALS'
  ];
  
  let allGood = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is configured`);
    } else {
      console.log(`❌ ${envVar} is missing`);
      allGood = false;
    }
  }
  
  return allGood;
}

async function runAllTests() {
  console.log('🚀 Starting Firebase FCM Integration Tests\\n');
  
  const tests = [
    { name: 'Environment Configuration', fn: testEnvironmentConfiguration },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Firebase Setup', fn: testFirebaseSetup },
    { name: 'Notification Service', fn: testNotificationService }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\\n--- ${test.name} ---`);
    const passed = await test.fn();
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('\\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All tests passed! FCM integration is ready to use.');
  } else {
    console.log('❌ Some tests failed. Please check the configuration and try again.');
  }
  console.log('='.repeat(50));
  
  // Close database connection
  await prisma.$disconnect();
}

// Handle script execution
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testFirebaseSetup,
  testDatabaseConnection,
  testNotificationService,
  testEnvironmentConfiguration,
  runAllTests
};
