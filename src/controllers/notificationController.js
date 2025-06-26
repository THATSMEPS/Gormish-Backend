const prisma = require('../config/prisma');
const { sendPushNotification } = require('../services/pushNotificationService');

// Store Expo push token for a delivery partner
const storeExpoPushToken = async (req, res) => {
  try {
    const { dpId, expoPushToken } = req.body;
    if (!dpId || !expoPushToken) {
      return res.status(400).json({ success: false, message: 'dpId and expoPushToken are required' });
    }
    await prisma.deliveryPartner.update({
      where: { id: dpId },
      data: { expoPushToken }
    });
    return res.status(200).json({ success: true, message: 'Expo push token stored successfully' });
  } catch (error) {
    console.error('[NotificationController] - Error storing Expo push token:', error);
    return res.status(500).json({ success: false, message: 'Failed to store Expo push token', error: error.message });
  }
};

// Send notification to all live delivery partners
const sendNotificationToApp = async (req, res) => {
  try {
    const { title, body, data } = req.body;
    const livePartners = await prisma.deliveryPartner.findMany({
      where: { isLive: true, expoPushToken: { not: null } }
    });

    for (const partner of livePartners) {
      try {
        await sendPushNotification(
          partner.expoPushToken,
          title,
          body,
          data
        );
      } catch (err) {
        console.error(`Failed to send notification to partner ${partner.id}:`, err);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Notifications sent to all live delivery partners'
    });
  } catch (error) {
    console.error('[NotificationController] - Error sending notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
};

module.exports = {
  storeExpoPushToken,
  sendNotificationToApp
};
