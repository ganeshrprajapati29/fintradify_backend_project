const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You need to add your Firebase service account key to config
// For now, assuming it's in process.env or a file
if (!admin.apps.length) {
  // Replace with your Firebase project config
  // You can use environment variables or a service account file
  const serviceAccount = require('../config/firebase-service-account.json'); // Add this file

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL: 'https://your-project.firebaseio.com' // If using Realtime Database
  });
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
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
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
  if (!tokens || tokens.length === 0) return;

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
    console.log('Successfully sent messages:', response);
    return response;
  } catch (error) {
    console.error('Error sending messages:', error);
    return null;
  }
};

module.exports = {
  sendNotification,
  sendNotificationToMultiple,
};
