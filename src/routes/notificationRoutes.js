const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Delivery Partner Routes
router.patch(
  "/delivery-partners/storeToken",
  notificationController.storeExpoPushToken
);
router.post(
  "/delivery-partners/sendNotificationToApp",
  notificationController.sendNotificationToApp
);

// Customer Routes
router.patch(
  "/customers/storeToken",
  notificationController.storeCustomerExpoPushToken
); // Legacy Expo token endpoint
router.patch(
  "/customers/storeFCMToken",
  notificationController.storeCustomerFCMToken
); // New FCM token endpoint
router.patch(
  "/customers/storePushTokens",
  notificationController.storeCustomerPushTokens
); // Universal endpoint for both tokens
router.post(
  "/customers/sendNotification",
  notificationController.sendNotificationToCustomer
);

// Restaurant Routes
router.patch(
  "/restaurants/storeToken",
  notificationController.storeRestaurantExpoPushToken
);
router.patch(
  "/restaurants/storeFCMToken",
  notificationController.storeRestaurantFCMToken
);

router.delete(
  "/restaurants/removeFCMToken",
  notificationController.removeRestaurantFCMToken
);
router.get(
  "/restaurants/:id/settings",
  notificationController.getRestaurantNotificationSettings
  
);
router.post(
  "/restaurants/sendNotification",
  notificationController.sendNotificationToRestaurant
);
router.post(
  "/restaurants/test",
  notificationController.sendTestNotificationToRestaurant
);

module.exports = router;
