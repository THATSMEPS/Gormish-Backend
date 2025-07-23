const prisma = require("../config/prisma");
const { sendPushNotification } = require("../services/pushNotificationService");
const {
  sendOrderStatusNotification,
} = require("../services/customerNotificationService");
const {
  sendNewOrderNotificationToRestaurant,
  restaurantNotificationService
} = require("../services/restaurantNotificationService");

// Store Expo push token for a delivery partner
const storeExpoPushToken = async (req, res) => {
  try {
    const { dpId, expoPushToken } = req.body;
    if (!dpId || !expoPushToken) {
      return res.status(400).json({
        success: false,
        message: "dpId and expoPushToken are required",
      });
    }
    await prisma.deliveryPartner.update({
      where: { id: dpId },
      data: { expoPushToken },
    });
    return res
      .status(200)
      .json({ success: true, message: "Expo push token stored successfully" });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing Expo push token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store Expo push token",
      error: error.message,
    });
  }
};

// Send notification to all live delivery partners
const sendNotificationToApp = async (req, res) => {
  try {
    const { title, body, data } = req.body;
    const livePartners = await prisma.deliveryPartner.findMany({
      where: { isLive: true, expoPushToken: { not: null } },
    });

    for (const partner of livePartners) {
      try {
        await sendPushNotification(partner.expoPushToken, title, body, data);
      } catch (err) {
        console.error(
          `Failed to send notification to partner ${partner.id}:`,
          err
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Notifications sent to all live delivery partners",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error sending notifications:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to send notifications",
      error: error.message,
    });
  }
};

// Store Expo push token for a customer
const storeCustomerExpoPushToken = async (req, res) => {
  try {
    const { customerId, expoPushToken } = req.body;
    if (!customerId || !expoPushToken) {
      return res.status(400).json({
        success: false,
        message: "customerId and expoPushToken are required",
      });
    }
    await prisma.customer.update({
      where: { id: customerId },
      data: { expoPushToken },
    });
    return res.status(200).json({
      success: true,
      message: "Expo push token stored successfully for customer",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing customer Expo push token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store customer Expo push token",
      error: error.message,
    });
  }
};

// Send notification to a specific customer
const sendNotificationToCustomer = async (req, res) => {
  try {
    const { customerId, title, body, data } = req.body;

    if (!customerId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "customerId, title, and body are required",
      });
    }

    // Use sendOrderStatusNotification instead of sendPushNotification
    await sendOrderStatusNotification(
      customerId,
      data?.orderId,
      data?.status || title.toLowerCase()
    );

    return res.status(200).json({
      success: true,
      message: "Notification sent to customer successfully",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error sending notification to customer:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to send notification to customer",
      error: error.message,
    });
  }
};

// Send notification to all customers with push tokens
const sendNotificationToAllCustomers = async (req, res) => {
  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: "title and body are required",
      });
    }

    const customers = await prisma.customer.findMany({
      where: { expoPushToken: { not: null } },
      select: { id: true, expoPushToken: true },
    });

    let successCount = 0;
    let failureCount = 0;

    for (const customer of customers) {
      try {
        await sendPushNotification(
          customer.expoPushToken,
          title,
          body,
          data || {}
        );
        successCount++;
      } catch (err) {
        console.error(
          `Failed to send notification to customer ${customer.id}:`,
          err
        );
        failureCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Notifications sent to customers`,
      stats: {
        total: customers.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error sending notifications to customers:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to send notifications to customers",
      error: error.message,
    });
  }
};

// Store Expo push token for a restaurant
const storeRestaurantExpoPushToken = async (req, res) => {
  try {
    const { restaurantId, expoPushToken } = req.body;
    if (!restaurantId || !expoPushToken) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and expoPushToken are required",
      });
    }
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { expoPushToken },
    });
    return res.status(200).json({
      success: true,
      message: "Expo push token stored successfully for restaurant",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing restaurant Expo push token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store restaurant Expo push token",
      error: error.message,
    });
  }
};

// Send notification to a specific restaurant
const sendNotificationToRestaurant = async (req, res) => {
  try {
    const { restaurantId, orderId } = req.body;
    if (!restaurantId || !orderId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and orderId are required",
      });
    }
    await sendNewOrderNotificationToRestaurant(restaurantId, orderId);
    return res.status(200).json({
      success: true,
      message: "Notification sent to restaurant successfully",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error sending notification to restaurant:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to send notification to restaurant",
      error: error.message,
    });
  }
};

// Store FCM token for web push notifications for a restaurant
const storeRestaurantFCMToken = async (req, res) => {
  try {
    const { restaurantId, fcmToken } = req.body;
    if (!restaurantId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and fcmToken are required",
      });
    }
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { fcmToken },
    });
    return res.status(200).json({
      success: true,
      message: "FCM token stored successfully for restaurant",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing restaurant FCM token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store restaurant FCM token",
      error: error.message,
    });
  }
};

// Store both Expo and FCM tokens for a restaurant (universal endpoint)
const storeRestaurantPushTokens = async (req, res) => {
  try {
    const { restaurantId, expoPushToken, fcmToken } = req.body;
    if (!restaurantId || (!expoPushToken && !fcmToken)) {
      return res.status(400).json({
        success: false,
        message:
          "restaurantId and at least one token (expoPushToken or fcmToken) are required",
      });
    }

    const updateData = {};
    if (expoPushToken) updateData.expoPushToken = expoPushToken;
    if (fcmToken) updateData.fcmToken = fcmToken;

    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Push tokens stored successfully for restaurant",
      tokens: { expoPushToken: !!expoPushToken, fcmToken: !!fcmToken },
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing restaurant push tokens:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store restaurant push tokens",
      error: error.message,
    });
  }
};

// Store FCM token for web push notifications for a customer
const storeCustomerFCMToken = async (req, res) => {
  try {
    const { customerId, fcmToken } = req.body;
    if (!customerId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "customerId and fcmToken are required",
      });
    }
    await prisma.customer.update({
      where: { id: customerId },
      data: { fcmToken },
    });
    return res.status(200).json({
      success: true,
      message: "FCM token stored successfully for customer",
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing customer FCM token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store customer FCM token",
      error: error.message,
    });
  }
};

// Store both Expo and FCM tokens for a customer (universal endpoint)
const storeCustomerPushTokens = async (req, res) => {
  try {
    const { customerId, expoPushToken, fcmToken } = req.body;

    if (!customerId) {
      return res
        .status(400)
        .json({ success: false, message: "customerId is required" });
    }

    if (!expoPushToken && !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "At least one token (expoPushToken or fcmToken) is required",
      });
    }

    const updateData = {};
    if (expoPushToken) updateData.expoPushToken = expoPushToken;
    if (fcmToken) updateData.fcmToken = fcmToken;

    await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Push tokens stored successfully for customer",
      stored: Object.keys(updateData),
    });
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing customer push tokens:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store customer push tokens",
      error: error.message,
    });
  }
};

// Store FCM token for web push notifications for a restaurant
const storeRestaurantFCMToken = async (req, res) => {
  try {
    const { restaurantId, fcmToken } = req.body;
    if (!restaurantId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "restaurantId and fcmToken are required",
      });
    }

    const result = await restaurantNotificationService.storeFCMToken(restaurantId, fcmToken);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "FCM token stored successfully for restaurant",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error(
      "[NotificationController] - Error storing restaurant FCM token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to store restaurant FCM token",
      error: error.message,
    });
  }
};

// Remove FCM token for a restaurant
const removeRestaurantFCMToken = async (req, res) => {
  try {
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const result = await restaurantNotificationService.removeFCMToken(restaurantId);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "FCM token removed successfully for restaurant",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error(
      "[NotificationController] - Error removing restaurant FCM token:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to remove restaurant FCM token",
      error: error.message,
    });
  }
};

// Get notification settings for a restaurant
const getRestaurantNotificationSettings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
    }

    const settings = await restaurantNotificationService.getNotificationSettings(id);
    
    if (settings.success) {
      return res.status(200).json({
        success: true,
        data: settings.data,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: settings.message,
      });
    }
  } catch (error) {
    console.error(
      "[NotificationController] - Error getting restaurant notification settings:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to get restaurant notification settings",
      error: error.message,
    });
  }
};

// Send test notification to a restaurant
const sendTestNotificationToRestaurant = async (req, res) => {
  try {
    const { restaurantId, title, body } = req.body;
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "restaurantId is required",
      });
    }

    const testTitle = title || "Test Notification";
    const testBody = body || "This is a test notification from Gormish Restaurant Dashboard";

    const result = await restaurantNotificationService.sendTestNotification(
      restaurantId,
      testTitle,
      testBody
    );
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Test notification sent successfully",
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error(
      "[NotificationController] - Error sending test notification:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Failed to send test notification",
      error: error.message,
    });
  }
};

module.exports = {
  storeExpoPushToken,
  sendNotificationToApp,
  storeCustomerExpoPushToken,
  storeCustomerFCMToken,
  storeCustomerPushTokens,
  sendNotificationToCustomer,
  sendNotificationToAllCustomers,
  storeRestaurantExpoPushToken,
  storeRestaurantFCMToken,
  storeRestaurantPushTokens,
  sendNotificationToRestaurant,
  storeRestaurantFCMToken,
  removeRestaurantFCMToken,
  getRestaurantNotificationSettings,
  sendTestNotificationToRestaurant,
};
