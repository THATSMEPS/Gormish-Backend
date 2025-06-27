const prisma = require('../config/prisma');
const { sendPushNotification } = require('../services/pushNotificationService');
const { sendOrderStatusNotification } = require('../services/customerNotificationService');
const { sendNewOrderNotificationToRestaurant } = require('../services/restaurantNotificationService');

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

// Store Expo push token for a customer
const storeCustomerExpoPushToken = async (req, res) => {
  try {
    const { customerId, expoPushToken } = req.body;
    if (!customerId || !expoPushToken) {
      return res.status(400).json({ success: false, message: 'customerId and expoPushToken are required' });
    }
    await prisma.customer.update({
      where: { id: customerId },
      data: { expoPushToken }
    });
    return res.status(200).json({ success: true, message: 'Expo push token stored successfully for customer' });
  } catch (error) {
    console.error('[NotificationController] - Error storing customer Expo push token:', error);
    return res.status(500).json({ success: false, message: 'Failed to store customer Expo push token', error: error.message });
  }
};

// Send notification to a specific customer
const sendNotificationToCustomer = async (req, res) => {
  try {
    const { customerId, title, body, data } = req.body;
    
    if (!customerId || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        message: 'customerId, title, and body are required' 
      });
    }

    // Use sendOrderStatusNotification instead of sendPushNotification
    await sendOrderStatusNotification(customerId, data?.orderId, data?.status || title.toLowerCase());

    return res.status(200).json({
      success: true,
      message: 'Notification sent to customer successfully'
    });
  } catch (error) {
    console.error('[NotificationController] - Error sending notification to customer:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification to customer',
      error: error.message
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
        message: 'title and body are required' 
      });
    }

    const customers = await prisma.customer.findMany({
      where: { expoPushToken: { not: null } },
      select: { id: true, expoPushToken: true }
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
        console.error(`Failed to send notification to customer ${customer.id}:`, err);
        failureCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Notifications sent to customers`,
      stats: {
        total: customers.length,
        successful: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('[NotificationController] - Error sending notifications to customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notifications to customers',
      error: error.message
    });
  }
};

// Store Expo push token for a restaurant
const storeRestaurantExpoPushToken = async (req, res) => {
  try {
    const { restaurantId, expoPushToken } = req.body;
    if (!restaurantId || !expoPushToken) {
      return res.status(400).json({ success: false, message: 'restaurantId and expoPushToken are required' });
    }
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { expoPushToken }
    });
    return res.status(200).json({ success: true, message: 'Expo push token stored successfully for restaurant' });
  } catch (error) {
    console.error('[NotificationController] - Error storing restaurant Expo push token:', error);
    return res.status(500).json({ success: false, message: 'Failed to store restaurant Expo push token', error: error.message });
  }
};

// Send notification to a specific restaurant
const sendNotificationToRestaurant = async (req, res) => {
  try {
    const { restaurantId, orderId } = req.body;
    if (!restaurantId || !orderId) {
      return res.status(400).json({ success: false, message: 'restaurantId and orderId are required' });
    }
    await sendNewOrderNotificationToRestaurant(restaurantId, orderId);
    return res.status(200).json({ success: true, message: 'Notification sent to restaurant successfully' });
  } catch (error) {
    console.error('[NotificationController] - Error sending notification to restaurant:', error);
    return res.status(500).json({ success: false, message: 'Failed to send notification to restaurant', error: error.message });
  }
};

module.exports = {
  storeExpoPushToken,
  sendNotificationToApp,
  storeCustomerExpoPushToken,
  sendNotificationToCustomer,
  sendNotificationToAllCustomers,
  storeRestaurantExpoPushToken,
  sendNotificationToRestaurant
};
