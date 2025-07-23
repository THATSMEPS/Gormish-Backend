const prisma = require('../config/prisma');
const { getFirebaseMessaging } = require('../config/firebase-admin');

/**
 * Restaurant Notification Service
 * Handles all Firebase FCM notifications for restaurants
 * Implements the requirements from the frontend Firebase FCM integration guide
 */

class RestaurantNotificationService {

  /**
   * Send new order notification to restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Notification result
   */
  async sendNewOrderNotification(restaurantId, orderId) {
    try {
      console.log(`[RestaurantNotificationService] Sending new order notification for order: ${orderId}`);
      
      // Get order details with customer information
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: { name: true, phone: true }
          },
          items: {
            include: {
              menuItem: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Get restaurant FCM tokens
      const tokens = await this.getRestaurantFCMTokens(restaurantId);
      
      if (tokens.length === 0) {
        console.log(`[RestaurantNotificationService] No active FCM tokens for restaurant: ${restaurantId}`);
        return { 
          success: false, 
          message: 'No active FCM tokens found',
          successCount: 0,
          failureCount: 0
        };
      }

      // Prepare notification payload
      const notification = {
        title: '🍽️ New Order Received!',
        body: `Order from ${order.customer.name} - ₹${order.totalAmount}`,
        icon: '/logo.png',
        badge: '/logo.png'
      };

      const data = {
        orderId: orderId.toString(),
        restaurantId: restaurantId.toString(),
        type: 'new_order',
        customerName: order.customer.name || 'Unknown Customer',
        totalAmount: order.totalAmount.toString(),
        itemCount: order.items.length.toString(),
        timestamp: new Date().toISOString()
      };

      // Send multicast notification
      const result = await this.sendMulticastNotification(tokens, notification, data);
      
      // Log notification
      await this.logNotification(
        restaurantId, 
        orderId, 
        'new_order', 
        notification, 
        data, 
        tokens, 
        result
      );
      
      console.log(`[RestaurantNotificationService] New order notification sent: ${result.successCount}/${tokens.length} delivered`);
      
      return result;

    } catch (error) {
      console.error('[RestaurantNotificationService] Error sending new order notification:', error);
      throw error;
    }
  }

  /**
   * Send order status update notification to restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {string} orderId - Order ID  
   * @param {string} newStatus - New order status
   * @returns {Promise<Object>} Notification result
   */
  async sendOrderUpdateNotification(restaurantId, orderId, newStatus) {
    try {
      console.log(`[RestaurantNotificationService] Sending order update notification for order: ${orderId}, status: ${newStatus}`);
      
      const statusMessages = {
        'confirmed': '✅ Order Confirmed',
        'preparing': '👨‍🍳 Order Being Prepared', 
        'ready': '🍽️ Order Ready for Pickup',
        'dispatch': '🚗 Order Out for Delivery',
        'delivered': '✅ Order Delivered',
        'cancelled': '❌ Order Cancelled',
        'rejected': '🚫 Order Rejected'
      };

      const tokens = await this.getRestaurantFCMTokens(restaurantId);
      
      if (tokens.length === 0) {
        return { 
          success: false, 
          message: 'No active FCM tokens found',
          successCount: 0,
          failureCount: 0
        };
      }

      const notification = {
        title: statusMessages[newStatus] || 'Order Updated',
        body: `Order #${orderId.substring(0, 8)} status updated to ${newStatus}`,
        icon: '/logo.png',
        badge: '/logo.png'
      };

      const data = {
        orderId: orderId.toString(),
        restaurantId: restaurantId.toString(), 
        type: 'order_update',
        status: newStatus,
        timestamp: new Date().toISOString()
      };

      const result = await this.sendMulticastNotification(tokens, notification, data);
      
      await this.logNotification(
        restaurantId,
        orderId,
        'order_update', 
        notification,
        data,
        tokens,
        result
      );
      
      return result;

    } catch (error) {
      console.error('[RestaurantNotificationService] Error sending order update notification:', error);
      throw error;
    }
  }

  /**
   * Send multicast notification to multiple FCM tokens
   * @param {string[]} tokens - Array of FCM tokens
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload  
   * @returns {Promise<Object>} Send result
   */
  async sendMulticastNotification(tokens, notification, data) {
    try {
      const messaging = getFirebaseMessaging();
      
      const message = {
        notification,
        data,
        tokens,
        webpush: {
          notification: {
            ...notification,
            requireInteraction: true,
            tag: 'gormish-order-notification',
            actions: [
              {
                action: 'view',
                title: 'View Order',
                icon: '/logo.png'
              },
              {
                action: 'dismiss', 
                title: 'Dismiss'
              }
            ]
          },
          fcmOptions: {
            link: '/#/dashboard'
          }
        }
      };

      const response = await messaging.sendMulticast(message);
      
      console.log(`[RestaurantNotificationService] Multicast sent: ${response.successCount}/${tokens.length} successful`);

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`[RestaurantNotificationService] Failed to send to token ${idx}:`, resp.error?.message);
            
            // Mark invalid tokens as inactive
            if (resp.error?.code === 'messaging/registration-token-not-registered' ||
                resp.error?.code === 'messaging/invalid-registration-token') {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        // Deactivate failed tokens
        if (failedTokens.length > 0) {
          await this.deactivateTokens(failedTokens);
        }
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        results: response.responses
      };

    } catch (error) {
      console.error('[RestaurantNotificationService] Error in sendMulticastNotification:', error);
      return {
        success: false,
        error: error.message,
        successCount: 0,
        failureCount: tokens.length
      };
    }
  }

  /**
   * Get active FCM tokens for a restaurant
   * @param {string} restaurantId - Restaurant ID
   * @returns {Promise<string[]>} Array of active FCM tokens
   */
  async getRestaurantFCMTokens(restaurantId) {
    try {
      // Get tokens from both restaurant.fcmToken and restaurant_fcm_tokens table
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { fcmToken: true }
      });

      // For now, we'll use a simplified approach since the new tables aren't migrated yet
      // Once migrated, we can add the full restaurant_fcm_tokens logic
      const tokens = [];
      
      // Add restaurant's primary FCM token if exists
      if (restaurant?.fcmToken) {
        tokens.push(restaurant.fcmToken);
      }

      return tokens;

    } catch (error) {
      console.error('[RestaurantNotificationService] Error getting FCM tokens:', error);
      return [];
    }
  }

  /**
   * Store FCM token for restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {string} fcmToken - FCM token
   * @param {string} deviceType - Device type (default: 'web')
   * @returns {Promise<Object>} Storage result
   */
  async storeFCMToken(restaurantId, fcmToken, deviceType = 'web') {
    console.log('[RestaurantNotificationService] ========== STORING FCM TOKEN ==========');
    console.log(`[RestaurantNotificationService] Starting FCM token storage for restaurant: ${restaurantId}`);
    console.log(`[RestaurantNotificationService] Token (first 20 chars): ${fcmToken.substring(0, 20)}...`);
    console.log(`[RestaurantNotificationService] Device type: ${deviceType}`);

    try {
      console.log('[RestaurantNotificationService] Updating restaurant record in database...');
      
      // Update primary token in restaurant table
      const updateResult = await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { fcmToken }
      });

      console.log('[RestaurantNotificationService] Database update successful');
      console.log('[RestaurantNotificationService] Updated restaurant ID:', updateResult.id);
      console.log(`[RestaurantNotificationService] FCM token stored successfully for restaurant: ${restaurantId}`);
      
      return {
        success: true,
        message: 'FCM token stored successfully'
      };

    } catch (error) {
      console.error('[RestaurantNotificationService] Error storing FCM token:', error);
      console.error('[RestaurantNotificationService] Error details:', {
        message: error.message,
        code: error.code,
        restaurantId,
        tokenLength: fcmToken?.length
      });
      
      return {
        success: false,
        message: 'Failed to store FCM token',
        error: error.message
      };
    }
  }

  /**
   * Remove FCM token for restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {string} fcmToken - FCM token to remove
   * @returns {Promise<Object>} Removal result
   */
  async removeFCMToken(restaurantId, fcmToken) {
    try {
      // Clear primary token if it matches
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { fcmToken: true }
      });

      if (restaurant?.fcmToken === fcmToken) {
        await prisma.restaurant.update({
          where: { id: restaurantId },
          data: { fcmToken: null }
        });
      }

      return {
        success: true,
        message: 'FCM token removed successfully'
      };

    } catch (error) {
      console.error('[RestaurantNotificationService] Error removing FCM token:', error);
      return {
        success: false,
        message: 'Failed to remove FCM token',
        error: error.message
      };
    }
  }

  /**
   * Log notification for analytics (simplified for now)
   * @param {string} restaurantId - Restaurant ID
   * @param {string} orderId - Order ID
   * @param {string} type - Notification type
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   * @param {string[]} tokens - FCM tokens used
   * @param {Object} result - Send result
   */
  async logNotification(restaurantId, orderId, type, notification, data, tokens, result) {
    try {
      // For now, just log to console until NotificationLog table is migrated
      console.log(`[RestaurantNotificationService] Notification logged: ${type} for restaurant ${restaurantId}, order ${orderId}, success: ${result.successCount}, failed: ${result.failureCount}`);
    } catch (error) {
      console.error('[RestaurantNotificationService] Error logging notification:', error);
    }
  }

  /**
   * Deactivate invalid FCM tokens (simplified for now)
   * @param {string[]} tokens - Array of invalid tokens
   */
  async deactivateTokens(tokens) {
    try {
      console.log(`[RestaurantNotificationService] Would deactivate ${tokens.length} invalid tokens: ${tokens.join(', ')}`);
      
      // For now, we'll just clear the primary token if it's invalid
      // Once the new tables are migrated, we can implement proper token management
      for (const token of tokens) {
        await prisma.restaurant.updateMany({
          where: { fcmToken: token },
          data: { fcmToken: null }
        });
      }
    } catch (error) {
      console.error('[RestaurantNotificationService] Error deactivating tokens:', error);
    }
  }

  /**
   * Send test notification to restaurant
   * @param {string} restaurantId - Restaurant ID
   * @returns {Promise<Object>} Test result
   */
  async sendTestNotification(restaurantId) {
    try {
      const tokens = await this.getRestaurantFCMTokens(restaurantId);
      
      if (tokens.length === 0) {
        return {
          success: false,
          message: 'No active FCM tokens found for restaurant'
        };
      }

      const notification = {
        title: '🧪 Test Notification',
        body: 'This is a test notification from Gormish Dashboard',
        icon: '/logo.png'
      };

      const data = {
        type: 'test',
        restaurantId: restaurantId.toString(),
        timestamp: new Date().toISOString()
      };

      const result = await this.sendMulticastNotification(tokens, notification, data);
      
      return {
        success: true,
        message: 'Test notification sent',
        ...result
      };

    } catch (error) {
      console.error('[RestaurantNotificationService] Error sending test notification:', error);
      return {
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      };
    }
  }

  /**
   * Get notification settings for restaurant
   * @param {string} restaurantId - Restaurant ID
   * @returns {Promise<Object>} Settings data
   */
  async getNotificationSettings(restaurantId) {
    try {
      // Simplified version for now
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { fcmToken: true }
      });

      return {
        success: true,
        data: {
          tokenCount: restaurant?.fcmToken ? 1 : 0,
          lastActivity: new Date(),
          stats: {
            totalSent: 0,
            totalDelivered: 0,
            totalFailed: 0
          }
        }
      };

    } catch (error) {
      console.error('[RestaurantNotificationService] Error getting notification settings:', error);
      return {
        success: false,
        message: 'Failed to get notification settings',
        error: error.message
      };
    }
  }
}

// Create instance and also export legacy function for backward compatibility
const restaurantNotificationService = new RestaurantNotificationService();

const sendNewOrderNotificationToRestaurant = async (restaurantId, orderId) => {
  return await restaurantNotificationService.sendNewOrderNotification(restaurantId, orderId);
};

module.exports = { 
  sendNewOrderNotificationToRestaurant,
  restaurantNotificationService
};
