const {
  sendPushNotification,
  sendUniversalPushNotification,
} = require("./pushNotificationService");

// Status message mappings for customer notifications
const getOrderStatusMessage = (status) => {
  const statusMessages = {
    pending: {
      title: "Order Confirmed!",
      body: "Your order has been confirmed and is being processed.",
    },
    preparing: {
      title: "Order Being Prepared",
      body: "The restaurant is now preparing your delicious food!",
    },
    ready: {
      title: "Order Ready!",
      body: "Your order is ready and will be picked up soon.",
    },
    dispatch: {
      title: "Order On The Way!",
      body: "Your order is out for delivery. It will reach you soon!",
    },
    delivered: {
      title: "Order Delivered!",
      body: "Your order has been delivered. Enjoy your meal!",
    },
  };

  return (
    statusMessages[status] || {
      title: "Order Update",
      body: `Your order status has been updated to ${status}.`,
    }
  );
};

// Send notification to customer for order status update
const sendOrderStatusNotification = async (customerId, orderId, newStatus) => {
  try {
    const prisma = require("../config/prisma");

    // Get customer with both expo and fcm push tokens
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        expoPushToken: true,
        fcmToken: true,
        name: true,
      },
    });

    // If customer doesn't have any push tokens, skip notification
    if (!customer || (!customer.expoPushToken && !customer.fcmToken)) {
      console.log(
        `[CustomerNotificationService] Customer ${customerId} does not have any push tokens`
      );
      return;
    }

    const message = getOrderStatusMessage(newStatus);
    const notificationData = {
      orderId: orderId,
      status: newStatus,
      type: "order_status_update",
    };

    const webPushOptions = {
      click_action: `/orders/${orderId}`,
      icon: "/pwa.png",
      badge: "/pwa.png",
      tag: `order-${orderId}`,
      requireInteraction: newStatus === "delivered",
    };

    // Send universal notification (both mobile and web if tokens available)
    const results = await sendUniversalPushNotification(
      customer.expoPushToken,
      customer.fcmToken,
      message.title,
      message.body,
      notificationData,
      webPushOptions
    );

    // Log results
    if (results.expo) {
      console.log(
        `[CustomerNotificationService] Expo notification sent to customer ${customerId} for order ${orderId} - Status: ${newStatus}`
      );
    }
    if (results.web) {
      console.log(
        `[CustomerNotificationService] Web push notification sent to customer ${customerId} for order ${orderId} - Status: ${newStatus}`
      );
    }
    if (results.errors.length > 0) {
      console.warn(
        `[CustomerNotificationService] Some notifications failed:`,
        results.errors
      );
    }
  } catch (error) {
    console.error(
      `[CustomerNotificationService] Error sending order status notification:`,
      error
    );
  }
};

module.exports = {
  sendOrderStatusNotification,
  getOrderStatusMessage,
};
