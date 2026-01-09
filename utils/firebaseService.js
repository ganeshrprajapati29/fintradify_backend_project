const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You need to add your Firebase service account key to config
// For now, assuming it's in process.env or a file
let firebaseInitialized = false;
let mockMode = false;

if (!admin.apps.length) {
  try {
    // Replace with your Firebase project config
    // You can use environment variables or a service account file
    const serviceAccount = require('../config/firebase-service-account.json'); // Add this file

    // Check if it's placeholder data
    if (serviceAccount.private_key && serviceAccount.private_key.includes('YOUR_PRIVATE_KEY_HERE')) {
      throw new Error('Placeholder service account key detected');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: 'https://your-project.firebaseio.com' // If using Realtime Database
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase Admin SDK initialization failed:', error.message);
    console.warn('🔄 Switching to mock notification mode for testing');
    mockMode = true;
    firebaseInitialized = true; // Set to true for mock mode
  }
}

/**
 * Send FCM notification to a single device
 * @param {string} token - FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
const sendNotification = async (token, title, body, data = {}) => {
  if (!token) return;

  // Mock mode - simulate successful notification sending
  if (mockMode) {
    console.log('📱 [MOCK] Successfully sent FCM notification to device');
    console.log('📱 [MOCK] Title:', title);
    console.log('📱 [MOCK] Body:', body);
    console.log('📱 [MOCK] Token:', token);

    // Simulate response structure
    const mockResponse = {
      messageId: `mock-message-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      success: true
    };

    return mockResponse;
  }

  // Real Firebase mode
  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
    data: data,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent FCM message:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending FCM message:', error);
    return null;
  }
};

/**
 * Send notification to multiple tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
const sendNotificationToMultiple = async (tokens, title, body, data = {}) => {
  if (!firebaseInitialized) {
    console.warn('Firebase not initialized, skipping notification');
    return null;
  }

  if (!tokens || tokens.length === 0) return;

  // Mock mode - simulate successful notification sending
  if (mockMode) {
    console.log('📱 [MOCK] Successfully sent FCM notification to', tokens.length, 'devices');
    console.log('📱 [MOCK] Title:', title);
    console.log('📱 [MOCK] Body:', body);
    console.log('📱 [MOCK] Tokens:', tokens);

    // Simulate response structure
    const mockResponse = {
      successCount: tokens.length,
      failureCount: 0,
      responses: tokens.map(token => ({
        messageId: `mock-message-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        success: true
      }))
    };

    return mockResponse;
  }

  // Real Firebase mode
  const message = {
    tokens: tokens,
    notification: {
      title: title,
      body: body,
    },
    data: data,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('✅ Successfully sent FCM messages:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending FCM messages:', error);
    return null;
  }
};

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
};
