const {
  sendPushNotification,
  sendUniversalPushNotification,
} = require("./pushNotificationService");

// Send notification to restaurant when a new order is placed
const sendNewOrderNotificationToRestaurant = async (restaurantId, orderId) => {
  const prisma = require("../config/prisma");
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { expoPushToken: true, fcmToken: true },
    });

    if (!restaurant || (!restaurant.expoPushToken && !restaurant.fcmToken)) {
      console.log(
        `[RestaurantNotificationService] Restaurant ${restaurantId} does not have any push tokens`
      );
      return;
    }

    // Use universal push service to send to both mobile and web if tokens exist
    await sendUniversalPushNotification(
      restaurant.expoPushToken,
      restaurant.fcmToken,
      "New Order Received!",
      "You have a new order. Please check your dashboard.",
      { orderId, type: "new_order" },
      { click_action: "/dashboard" } // Web-specific options
    );

    console.log(
      `[RestaurantNotificationService] New order notification sent to restaurant ${restaurantId} for order ${orderId}`
    );
  } catch (error) {
    console.error(
      `[RestaurantNotificationService] Error sending new order notification:`,
      error
    );
  }
};

module.exports = { sendNewOrderNotificationToRestaurant };
