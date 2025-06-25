const prisma = require('../config/prisma');

async function storeToken (req, res) {
  const { dpId, expoPushToken } = req.body;
  if (!dpId || !expoPushToken) {
    return res.status(400).json({ success: false, message: 'Missing dpId or expoPushToken' });
  }
  try {
    await prisma.deliveryPartner.update({
      where: { id: dpId },
      data: { expoPushToken },
    });
    res.json({ success: true, message: 'Token stored successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to store token', error: error.message });
  }
}

async function sendNotificationToDPs(req, res) {
  try {
    const { title, body, data } = req.body;
    const liveDPs = await prisma.deliveryPartner.findMany({
      where: { isLive: true, expoPushToken: { not: null } }
    });

    if (!liveDPs.length) {
      return res.status(404).json({ success: false, message: 'No live delivery partners with push tokens found.' });
    }

    for (const dp of liveDPs) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: dp.expoPushToken,
          sound: 'default',
          title,
          body,
          data: data || {},
        }),
      });
    }

    res.json({ success: true, message: 'Notifications sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send notifications', error: error.message });
  }
}

module.exports = { storeToken, sendNotificationToDPs };