const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    throw new Error('Invalid Expo push token');
  }

  const messages = [{
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  }];

  let ticketChunk = await expo.sendPushNotificationsAsync(messages);
  return ticketChunk;
}

module.exports = { sendPushNotification };