const { OrderModel } = require('../models');
const CONSTANTS = require('../config/constant');

// Create a new order
const createOrder = async (userId, cart, paymentMethod, orderNote) => {
    const customOrderId = Math.floor(Date.now() / 1000).toString();
    const orderNumber = `#${customOrderId}`;
    cart.items.forEach(item => {
        const product = item.item;

        if (product.itemType === 'room') {
            const checkIn = new Date(item.checkIn);
            const checkOut = new Date(item.checkOut);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            if (nights <= 0) {
                throw new Error(CONSTANTS.INVALID_DATES);
            }
            item.price = product.roomPrice * nights;
        } else if (product.itemType === 'product') {
            const variant = product.variants.find(v => v.size === item.selectedSize && v.color === item.selectedColor);
            if (!variant) {
                throw new Error(CONSTANTS.VARIANT_NOT_FOUND);
            }
            item.price = variant.productPrice * item.quantity;
        } else if (product.itemType === 'food') {
            item.price = product.dishPrice * item.quantity;
        }
    });
    const order = new OrderModel({
        user: userId,
        items: cart.items,
        deliveryAddress: cart.deliveryAddress,
        totalPrice: cart.totalPrice,
        subtotal: cart.subtotal,
        tax: cart.tax,
        deliveryCharge: cart.deliveryCharge,
        paymentMethod: paymentMethod,
        orderNote: orderNote,
        orderId: customOrderId,
        orderNumber: orderNumber,
        status: paymentMethod === 'online' ? 'pending_payment' : 'ordered'
    });

    await order.save();

    // If payment method is online, handle payment processing
    if (paymentMethod === 'online') {
        const paymentResult = await processOnlinePayment(order);

        if (!paymentResult.success) {
            console.log("Payment failed, marking the order as failed.");
            order.paymentFailed = true;
            return order;
        }
        console.log("Payment successful, updating order status to paid.");
        order.status = 'paid';
        await order.save();
    }
    cart.items = [];
    cart.totalPrice = 0;
    cart.subtotal = 0;
    cart.tax = 0;
    cart.deliveryCharge = 0;
    await cart.save();
    return order;
};

// Mock online payment processing (this should be replaced with real payment logic)
const processOnlinePayment = async (order) => {
    // Simulate an online payment (replace with actual payment gateway integration)
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });  // Simulate successful payment
        }, 2000);  // Simulate a 2-second delay for the payment process
    });
};

const updateOrderStatus = async (orderId, status) => {
    const order = await OrderModel.findById(orderId);
    if (!order) { throw new Error(CONSTANTS.ORDER_NOT_FOUND) }
    if (order.status === 'delivered' || order.status === 'cancelled') { throw new Error(CONSTANTS.UPDATE_STATUS_AFTER_DELIVERD_ERROR) }
    order.status = status;
    await order.save();
    return order;
};

// Get all orders by user
const getOrdersByUser = async (userId) => {
    const orders = await OrderModel.find({ user: userId })
        .populate('items.item')
        .sort({ createdAt: -1 });
    return orders;
};

// Get order by ID
const getOrderById = async (orderId) => {
    const order = await OrderModel.findById(orderId)
        .populate('user', '_id name email phone')
        .populate('items.item');
    return order;
};

// Cancel an order
const cancelOrder = async (orderId, reason) => {
    const order = await OrderModel.findById(orderId);
    if (!order) { throw new Error(CONSTANTS.ORDER_NOT_FOUND) }
    order.status = 'cancelled';
    order.cancellationReason = reason;
    await order.save();
    return order;
};

// Track order status
const trackOrder = async (orderId) => {
    const order = await OrderModel.findById(orderId);
    return order;
};

const queryOrder = async (options) => {
    var condition = {};
    if (options.searchBy && options.searchBy !== 'undefined') {
        condition.$or = [{
            orderId: {
                $regex: '.*' + options.searchBy + '.*',
                $options: 'si',
            }
        }];
    }
    if (options.status && options.status !== 'undefined') { condition.status = options.status }
    options['sort'] = { createdAt: -1 };
    const data = await OrderModel.paginate(condition, {
        ...options,
        populate: {
            path: 'user',
            select: 'name email'
        }
    });
    return data;
};

const getOrdersByUserIdAdmin = async (userId = null, search = '', sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10) => {
    const query = userId ? { user: userId } : {};
    if (search) {
        query.$or = [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } }
        ];
    }
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const orders = await OrderModel.find(query)
        .populate('user', 'name email')
        .populate('items.item')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);
    const totalOrders = await OrderModel.countDocuments(query);
    return { orders, totalOrders };
};

module.exports = {
    createOrder,
    processOnlinePayment,
    updateOrderStatus,
    getOrdersByUser,
    getOrderById,
    cancelOrder,
    trackOrder,
    queryOrder,
    getOrdersByUserIdAdmin
};