const { Expo } = require('expo-server-sdk');
const { sendWebPushNotification } = require('./webPushNotificationService');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification using Expo (for mobile apps)
 * @param {string} expoPushToken - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise} - Expo notification response
 */
async function sendExpoPushNotification(expoPushToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    throw new Error('Invalid Expo push token');
  }

  const messages = [{
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  }];

  let ticketChunk = await expo.sendPushNotificationsAsync(messages);
  return ticketChunk;
}

/**
 * Send push notification to both mobile (Expo) and web (FCM) if tokens are available
 * @param {string} expoPushToken - Expo push token (for mobile)
 * @param {string} fcmToken - FCM token (for web)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} webPushOptions - Web push specific options
 * @returns {Promise} - Combined results
 */
async function sendUniversalPushNotification(expoPushToken, fcmToken, title, body, data = {}, webPushOptions = {}) {
  const results = {
    expo: null,
    web: null,
    errors: []
  };

  // Send to mobile (Expo) if token exists
  if (expoPushToken && Expo.isExpoPushToken(expoPushToken)) {
    try {
      results.expo = await sendExpoPushNotification(expoPushToken, title, body, data);
      console.log('[PushNotificationService] Expo notification sent successfully');
    } catch (error) {
      console.error('[PushNotificationService] Error sending Expo notification:', error);
      results.errors.push({ platform: 'expo', error: error.message });
    }
  }

  // Send to web (FCM) if token exists
  if (fcmToken) {
    try {
      results.web = await sendWebPushNotification(fcmToken, title, body, data, webPushOptions);
      console.log('[PushNotificationService] Web push notification sent successfully');
    } catch (error) {
      console.error('[PushNotificationService] Error sending web push notification:', error);
      results.errors.push({ platform: 'web', error: error.message });
    }
  }

  return results;
}

// Backward compatibility - keep the old function name
async function sendPushNotification(expoPushToken, title, body, data = {}) {
  return sendExpoPushNotification(expoPushToken, title, body, data);
}

module.exports = { 
  sendPushNotification, // Backward compatibility
  sendExpoPushNotification,
  sendWebPushNotification,
  sendUniversalPushNotification
};