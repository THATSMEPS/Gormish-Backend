const { sendPushNotification } = require('./pushNotificationService');

// Send notification to restaurant when a new order is placed
const sendNewOrderNotificationToRestaurant = async (restaurantId, orderId) => {
  const prisma = require('../config/prisma');
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { expoPushToken: true }
    });
    if (!restaurant || !restaurant.expoPushToken) {
      console.log(`[RestaurantNotificationService] Restaurant ${restaurantId} does not have expo push token`);
      return;
    }
    await sendPushNotification(
      restaurant.expoPushToken,
      'New Order Received!',
      'You have a new order. Please check your dashboard.',
      { orderId, type: 'new_order' }
    );
    console.log(`[RestaurantNotificationService] New order notification sent to restaurant ${restaurantId} for order ${orderId}`);
  } catch (error) {
    console.error(`[RestaurantNotificationService] Error sending new order notification:`, error);
  }
};

module.exports = { sendNewOrderNotificationToRestaurant };
