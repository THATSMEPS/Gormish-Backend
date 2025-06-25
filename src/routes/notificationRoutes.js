const express = require('express');
const { storeToken, sendNotificationToDPs } = require('../controllers/notificationController');

const router = express.Router();

router.patch('/delivery-partners/storeToken', storeToken);
router.post('/delivery-partners/sendNotificationToApp', sendNotificationToDPs);

module.exports = router;