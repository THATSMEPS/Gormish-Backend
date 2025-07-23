const { getFirebaseMessaging } = require('../config/firebase-admin');

/**
 * Web Push Notification Service using Firebase Cloud Messaging
 * Updated to use centralized Firebase Admin configuration
 */

/**
 * Send push notification to web browsers using Firebase Cloud Messaging
 * @param {string} fcmToken - FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} webPush - Web push specific options
 * @returns {Promise} - Firebase messaging response
 */
async function sendWebPushNotification(
  fcmToken,
  title,
  body,
  data = {},
  webPush = {}
) {
  try {
    if (!fcmToken) {
      throw new Error("FCM token is required");
    }

    const messaging = getFirebaseMessaging();

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        // Convert all data values to strings as FCM requires
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
        click_action: webPush.click_action || "/",
      },
      webpush: {
        headers: {
          TTL: "86400", // 24 hours
        },
        notification: {
          title,
          body,
          icon: webPush.icon || "/pwa.png",
          badge: webPush.badge || "/pwa.png",
          image: webPush.image,
          tag: webPush.tag || "default",
          renotify: webPush.renotify || false,
          requireInteraction: webPush.requireInteraction || false,
          actions: webPush.actions || [],
          data: data,
        },
        fcm_options: {
          link: webPush.click_action || "/",
        },
      },
    };

    const response = await messaging.send(message);
    console.log(
      "[WebPushNotificationService] Successfully sent message:",
      response
    );
    return response;
  } catch (error) {
    console.error("[WebPushNotificationService] Error sending message:", error);
    throw error;
  }
}

/**
 * Send push notifications to multiple FCM tokens
 * @param {Array} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} webPush - Web push specific options
 * @returns {Promise} - Array of results
 */
async function sendMulticastWebPushNotification(
  tokens,
  title,
  body,
  data = {},
  webPush = {}
) {
  try {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new Error("Tokens array is required and must not be empty");
    }

    const messaging = getFirebaseMessaging();

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        // Convert all data values to strings as FCM requires
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
        click_action: webPush.click_action || "/",
      },
      tokens,
      webpush: {
        headers: {
          TTL: "86400", // 24 hours
        },
        notification: {
          title,
          body,
          icon: webPush.icon || "/pwa.png",
          badge: webPush.badge || "/pwa.png",
          image: webPush.image,
          tag: webPush.tag || "default",
          renotify: webPush.renotify || false,
          requireInteraction: webPush.requireInteraction || false,
          actions: webPush.actions || [],
          data: data,
        },
        fcm_options: {
          link: webPush.click_action || "/",
        },
      },
    };

    const response = await messaging.sendMulticast(message);
    console.log(
      `[WebPushNotificationService] Multicast sent: ${response.successCount}/${tokens.length} successful`
    );

    // Handle failed tokens
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(
            `[WebPushNotificationService] Failed to send to token ${idx}:`,
            resp.error
          );
        }
      });
    }

    return response;
  } catch (error) {
    console.error(
      "[WebPushNotificationService] Error sending multicast:",
      error
    );
    throw error;
  }
}

/**
 * Validate FCM token
 * @param {string} token - FCM token to validate
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
async function validateFCMToken(token) {
  try {
    if (!token) return false;

    const messaging = getFirebaseMessaging();

    // Try to send a test message to validate the token
    const testMessage = {
      token: token,
      data: {
        test: "true",
      },
      // Use dry_run to validate without actually sending
      dryRun: true,
    };

    await messaging.send(testMessage);
    return true;
  } catch (error) {
    console.error(
      "[WebPushNotificationService] Invalid FCM token:",
      error.message
    );
    return false;
  }
}

module.exports = {
  sendWebPushNotification,
  sendMulticastWebPushNotification,
  validateFCMToken,
};

/**
 * Send push notification to web browsers using Firebase Cloud Messaging
 * @param {string} fcmToken - FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} webPush - Web push specific options
 * @returns {Promise} - Firebase messaging response
 */
async function sendWebPushNotification(
  fcmToken,
  title,
  body,
  data = {},
  webPush = {}
) {
  try {
    if (!fcmToken) {
      throw new Error("FCM token is required");
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        // Convert all data values to strings as FCM requires
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
        click_action: webPush.click_action || "/",
      },
      webpush: {
        headers: {
          TTL: "86400", // 24 hours
        },
        notification: {
          title,
          body,
          icon: webPush.icon || "/pwa.png",
          badge: webPush.badge || "/pwa.png",
          image: webPush.image,
          tag: webPush.tag || "default",
          renotify: webPush.renotify || false,
          requireInteraction: webPush.requireInteraction || false,
          actions: webPush.actions || [],
          data: data,
        },
        fcm_options: {
          link: webPush.click_action || "/",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(
      "[WebPushNotificationService] Successfully sent message:",
      response
    );
    return response;
  } catch (error) {
    console.error("[WebPushNotificationService] Error sending message:", error);
    throw error;
  }
}

/**
 * Send push notifications to multiple FCM tokens
 * @param {Array} tokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} webPush - Web push specific options
 * @returns {Promise} - Array of results
 */
async function sendMulticastWebPushNotification(
  tokens,
  title,
  body,
  data = {},
  webPush = {}
) {
  try {
    if (!tokens || tokens.length === 0) {
      throw new Error("At least one FCM token is required");
    }

    const message = {
      tokens: tokens,
      notification: {
        title,
        body,
      },
      data: {
        // Convert all data values to strings as FCM requires
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {}),
        click_action: webPush.click_action || "/",
      },
      webpush: {
        headers: {
          TTL: "86400", // 24 hours
        },
        notification: {
          title,
          body,
          icon: webPush.icon || "/pwa.png",
          badge: webPush.badge || "/pwa.png",
          image: webPush.image,
          tag: webPush.tag || "default",
          renotify: webPush.renotify || false,
          requireInteraction: webPush.requireInteraction || false,
          actions: webPush.actions || [],
          data: data,
        },
        fcm_options: {
          link: webPush.click_action || "/",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      "[WebPushNotificationService] Successfully sent multicast message:",
      response
    );
    return response;
  } catch (error) {
    console.error(
      "[WebPushNotificationService] Error sending multicast message:",
      error
    );
    throw error;
  }
}

/**
 * Validate FCM token
 * @param {string} token - FCM token to validate
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
async function validateFCMToken(token) {
  try {
    if (!token) return false;

    // Try to send a test message to validate the token
    const testMessage = {
      token: token,
      data: {
        test: "true",
      },
      // Use dry_run to validate without actually sending
      dryRun: true,
    };

    await admin.messaging().send(testMessage);
    return true;
  } catch (error) {
    console.error(
      "[WebPushNotificationService] Invalid FCM token:",
      error.message
    );
    return false;
  }
}

module.exports = {
  sendWebPushNotification,
  sendMulticastWebPushNotification,
  validateFCMToken,
};
