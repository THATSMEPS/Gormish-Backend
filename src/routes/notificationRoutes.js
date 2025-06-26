const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Delivery Partner Routes
router.patch('/delivery-partners/storeToken', notificationController.storeExpoPushToken);
router.post('/delivery-partners/sendNotificationToApp', notificationController.sendNotificationToApp);

// Customer Routes
router.patch('/customers/storeToken', notificationController.storeCustomerExpoPushToken);
router.post('/customers/sendNotification', notificationController.sendNotificationToCustomer);

module.exports = router;