const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.patch('/delivery-partners/storeToken', notificationController.storeExpoPushToken);
router.post('/delivery-partners/sendNotificationToApp', notificationController.sendNotificationToApp);

module.exports = router;