const prisma = require('../config/prisma');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { sendNewOrderNotificationToRestaurant, restaurantNotificationService } = require('../services/restaurantNotificationService');

const createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      customerId,
      items,
      paymentType,
      customerNotes,
      distance,
      orderType,
      address
    } = req.body;
    // Calculate items amount and GST

    let calculatedItemsTotal = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId }
      });

      if (!menuItem) {
        return errorResponse(res, `Menu item not found: ${item.menuItemId}`, 404);
      }

      const itemBasePriceForOrderItem = menuItem.price;
      const itemPriceAfterDiscount = menuItem.discountedPrice || itemBasePriceForOrderItem;
      const itemTotalPrice = itemPriceAfterDiscount * item.quantity;

      let totalAddonPriceForOrderItem = 0;
      let addonsJsonForOrderItem = null; // Will be null if no addons, or an array if present

      if (item.item_addons && Array.isArray(item.item_addons)) {
        addonsJsonForOrderItem = item.item_addons; // Store the frontend's addons array as JSON
        for (const addon of item.item_addons) {
          if (addon.extraPrice && typeof addon.extraPrice === 'number') {
            totalAddonPriceForOrderItem += addon.extraPrice;
          }
        }
      } else if (item.item_addons) { // If it exists but isn't an array
        return errorResponse(res, 'Invalid addons format. Must be an array of addon objects.', 400);
      }
      // If item.item_addons is not provided or is null, addonsJsonForOrderItem remains null,
      // which is correct for `json null` in the schema.

      const itemTotalWithAddons = itemTotalPrice + totalAddonPriceForOrderItem;
      calculatedItemsTotal += itemTotalWithAddons;

      orderItemsToCreate.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        basePrice: itemBasePriceForOrderItem,
        addons: addonsJsonForOrderItem,       // <--- YAHAN PAR 'addons' KEY USE KARO (as per your schema.prisma)
        totalAddonPrice: totalAddonPriceForOrderItem,
        totalPrice: itemTotalWithAddons
      });
    }

    const gst = calculatedItemsTotal * 0.05;
    const deliveryFee = distance * 0;
    const totalAmount = calculatedItemsTotal + gst;

    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerId,
        status: 'pending',
        paymentType,
        customerNotes,
        distance,
        address,
        orderType,
        itemsAmount: calculatedItemsTotal,
        gst,
        deliveryFee,
        totalAmount,
        items: {
          create: orderItemsToCreate
        }
      },
      include: {
        items: true
      }
    });

    // --- Send notification to all live delivery partners ---
    await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/notifications/delivery-partners/sendNotificationToApp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Order Available',
        body: 'A new order has been placed. Tap to view details.',
        data: { orderId: order.id }
      }),
    });

    // --- Send notification to the specific restaurant that received the order ---
    await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/notifications/restaurants/sendNotification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: restaurantId,
        orderId: order.id
      }),
    });

    return successResponse(res, { orderId: order.id }, 'Order created successfully', 201);

  } catch (error) {
    console.error('[OrderController] - Error creating order:', error);
    return errorResponse(res, 'Error creating order', 500, error);
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['pending', 'preparing', 'ready'] } // Filter active orders
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        restaurant: true,
        customer: true,
        deliveryPartner: true
      }
      
    });

    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving orders', 500, error);
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        restaurant: true,
        customer: true,
        deliveryPartner: true
      }
    });

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    return successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving order', 500, error);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // console.log(`Received status update request for order ${id} with status: ${status}`);

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      // console.log(`Order with id ${id} not found`);
      return errorResponse(res, 'Order not found', 404);
    }

    // --- NEW LOGIC: Prevent dispatch if delivery partner not accepted ---
    if (status === 'dispatch') {
      if (order.status !== 'ready') {
        return errorResponse(res, 'Order must be in ready state to dispatch', 400);
      }
      if (!order.deliveryPartnerId) {
        return errorResponse(res, 'Cannot dispatch: No delivery partner has accepted this order', 400);
      }
    }
    // --- END NEW LOGIC ---

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status }
    });

    // Send push notification to customer for status update
    // Only send notifications for the specific status changes you want
    const notificationStatuses = ['pending', 'preparing', 'ready', 'dispatch', 'delivered'];
    if (notificationStatuses.includes(status)) {
      // Send notification to customer via API endpoint
      await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/notifications/customers/sendNotification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: order.customerId,
          title: status.charAt(0).toUpperCase() + status.slice(1),
          body: `Your order status is now ${status}.`,
          data: { orderId: id, status }
        }),
      });
    }

    // console.log(`Order ${id} status updated to: ${updatedOrder.status}`);

    // Emit socket.io event for order update
    const fullOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        customer: true,
        deliveryPartner: true
      }
    });

    // const io = req.app.get('io');
    // io.emit('order:update', fullOrder);

    return successResponse(res, updatedOrder, 'Order status updated successfully');
  } catch (error) {
    console.error('Error updating order status:', error);
    return errorResponse(res, 'Error updating order status', 500, error);
  }
};

const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        restaurant: true,
        deliveryPartner: true
      },
      orderBy: {
        placedAt: 'desc'
      }
    });

    return successResponse(res, orders, 'Customer orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving customer orders', 500, error);
  }
};

const getDeliveryPartnerOrders = async (req, res) => {
  try {
    const { dpId } = req.params;

    const orders = await prisma.order.findMany({
      where: { 
        deliveryPartnerId: dpId,
        status: {
          in: ['dispatch', 'delivered']
        }
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        restaurant: true,
        customer: true
      },
      orderBy: {
        placedAt: 'desc'
      }
    });

    return successResponse(res, orders, 'Delivery partner orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving delivery partner orders', 500, error);
  }
};


const getRestaurantOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['pending', 'preparing', 'ready'] } // Filter active orders
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        customer: true,
        deliveryPartner: true
      },
      orderBy: {
        placedAt: 'desc'
      }
    });

    return successResponse(res, orders, 'Restaurant orders retrieved successfully');
  } catch (error) {
    console.error('Error retrieving restaurant orders:', error);
    return errorResponse(res, 'Error retrieving restaurant orders', 500, error);
  }
};
const getRestaurantOrderHistory = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    
    if (restaurantId !== req.user.id) {
      return errorResponse(res, 'Unauthorized: You do not have access to this restaurant', 403);
    }

    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['dispatch', 'rejected', 'delivered'] } // History orders now includes 'delivered'
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        customer: true,
        deliveryPartner: true
      },
      orderBy: { placedAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    return successResponse(res, orders, 'Restaurant order history retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving restaurant order history', 500, error);
  }
};
const getOrdersByReadyStatus = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['ready', 'preparing'] }, // Status can be 'ready' or 'preparing'
        deliveryPartnerId: null, // Delivery partner ID must be null
        dpAcceptedAt: null, // Delivery partner accepted at must be null
        dpDeliveredAt: null // Delivery partner delivered at must be null
      },
      include: {
        items: {
          include: {
            menuItem: true
          }
        },
        restaurant: true,
        customer: true,
        deliveryPartner: true
      }
    });

    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Error retrieving orders', 500, error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getCustomerOrders,
  getRestaurantOrders,
  getDeliveryPartnerOrders,
  getRestaurantOrderHistory,
  getOrdersByReadyStatus
};
