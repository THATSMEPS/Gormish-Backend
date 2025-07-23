const admin = require('firebase-admin');
const path = require('path');

/**
 * Firebase Admin SDK Configuration
 * Centralized configuration for Firebase Admin SDK
 */

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App} Firebase Admin App instance
 */
const initializeFirebaseAdmin = () => {
  try {
    // Return existing app if already initialized
    if (firebaseApp) {
      return firebaseApp;
    }

    // Check if Firebase is already initialized by another service
    if (admin.apps.length > 0) {
      firebaseApp = admin.app();
      console.log('[Firebase Admin] Using existing Firebase Admin app');
      return firebaseApp;
    }

    let serviceAccount;

    // Try to get service account from environment variable (preferred for production)
    if (process.env.FIREBASE_CREDENTIALS) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        
        // Fix newlines in private key if they were escaped
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        console.log('[Firebase Admin] Using service account from environment variable');
      } catch (error) {
        console.error('[Firebase Admin] Invalid FIREBASE_CREDENTIALS environment variable:', error.message);
        throw new Error('Invalid Firebase credentials in environment variable');
      }
    } else {
      // Fallback to service account file
      try {
        const credentialsPath = path.join(__dirname, 'firebasecreds.json');
        serviceAccount = require(credentialsPath);
        console.log('[Firebase Admin] Using service account from file');
      } catch (error) {
        console.error('[Firebase Admin] Firebase credentials file not found:', error.message);
        throw new Error('Firebase credentials not found. Please provide FIREBASE_CREDENTIALS environment variable or firebasecreds.json file');
      }
    }

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required Firebase credentials: ${missingFields.join(', ')}`);
    }

    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    console.log('[Firebase Admin] Firebase Admin SDK initialized successfully');
    console.log('[Firebase Admin] Project ID:', serviceAccount.project_id);
    
    return firebaseApp;

  } catch (error) {
    console.error('[Firebase Admin] Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
};

/**
 * Get Firebase Messaging instance
 * @returns {admin.messaging.Messaging} Firebase Messaging instance
 */
const getFirebaseMessaging = () => {
  try {
    if (!firebaseApp) {
      initializeFirebaseAdmin();
    }
    return admin.messaging();
  } catch (error) {
    console.error('[Firebase Admin] Failed to get Firebase Messaging:', error.message);
    throw error;
  }
};

/**
 * Validate Firebase Admin initialization
 * @returns {boolean} True if Firebase is properly initialized
 */
const isFirebaseInitialized = () => {
  return firebaseApp !== null && admin.apps.length > 0;
};

/**
 * Get Firebase Admin App instance
 * @returns {admin.app.App|null} Firebase Admin App instance or null
 */
const getFirebaseApp = () => {
  return firebaseApp;
};

/**
 * Health check for Firebase Admin
 * @returns {Promise<Object>} Health status
 */
const healthCheck = async () => {
  try {
    if (!isFirebaseInitialized()) {
      return {
        status: 'unhealthy',
        message: 'Firebase Admin not initialized'
      };
    }

    // Try to get project info to verify connection
    const messaging = getFirebaseMessaging();
    
    // Test with a dry run message to verify messaging works
    const testMessage = {
      data: { test: 'true' },
      tokens: ['test-token']
    };

    try {
      await messaging.sendMulticast({ ...testMessage, dryRun: true });
    } catch (error) {
      // Expected to fail with invalid token, but confirms Firebase connection
      if (!error.message.includes('invalid-registration-token')) {
        throw error;
      }
    }

    return {
      status: 'healthy',
      message: 'Firebase Admin is working properly',
      projectId: firebaseApp?.options?.projectId
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      error: error.code || 'unknown'
    };
  }
};

module.exports = {
  initializeFirebaseAdmin,
  getFirebaseMessaging,
  getFirebaseApp,
  isFirebaseInitialized,
  healthCheck,
  admin // Export admin for direct access if needed
};
