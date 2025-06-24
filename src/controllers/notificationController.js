const { sendPushNotification } = require('../services/pushNotificationService');

async function sendNotification(req, res) {
  const { expoPushToken, title, body, data } = req.body;
  try {
    const result = await sendPushNotification(expoPushToken, title, body, data);
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = { sendNotification };