const { sendPushNotification } = require('./pushNotificationService');

// Status message mappings for customer notifications
const getOrderStatusMessage = (status) => {
  const statusMessages = {
    'pending': {
      title: 'Order Confirmed!',
      body: 'Your order has been confirmed and is being processed.'
    },
    'preparing': {
      title: 'Order Being Prepared',
      body: 'The restaurant is now preparing your delicious food!'
    },
    'ready': {
      title: 'Order Ready!',
      body: 'Your order is ready and will be picked up soon.'
    },
    'dispatch': {
      title: 'Order On The Way!',
      body: 'Your order is out for delivery. It will reach you soon!'
    },
    'delivered': {
      title: 'Order Delivered!',
      body: 'Your order has been delivered. Enjoy your meal!'
    }
  };

  return statusMessages[status] || {
    title: 'Order Update',
    body: `Your order status has been updated to ${status}.`
  };
};

// Send notification to customer for order status update
const sendOrderStatusNotification = async (customerId, orderId, newStatus) => {
  try {
    const prisma = require('../config/prisma');
    
    // Get customer with expo push token
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { expoPushToken: true, name: true }
    });

    // If customer doesn't have expo push token, skip notification
    if (!customer || !customer.expoPushToken) {
      console.log(`[CustomerNotificationService] Customer ${customerId} does not have expo push token`);
      return;
    }

    const message = getOrderStatusMessage(newStatus);
    
    // Send notification
    await sendPushNotification(
      customer.expoPushToken,
      message.title,
      message.body,
      {
        orderId: orderId,
        status: newStatus,
        type: 'order_status_update'
      }
    );

    console.log(`[CustomerNotificationService] Order status notification sent to customer ${customerId} for order ${orderId} - Status: ${newStatus}`);
  } catch (error) {
    console.error(`[CustomerNotificationService] Error sending order status notification:`, error);
  }
};

module.exports = {
  sendOrderStatusNotification,
  getOrderStatusMessage
};
