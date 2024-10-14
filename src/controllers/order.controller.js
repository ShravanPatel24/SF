const catchAsync = require('../utils/catchAsync');
const { OrderService } = require('../services');
const { CartModel, OrderModel } = require('../models');
const CONSTANTS = require('../config/constant');

// Create a new order
const createOrder = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { cartId, paymentMethod, orderNote } = req.body;
    const cart = await CartModel.findById(cartId).populate({
        path: 'items.item',
        strictPopulate: false // Allow flexible population
    });
    if (!cart || cart.items.length === 0) { return res.status(400).json({ message: CONSTANTS.CART_EMPTY }) }
    let containsRoom = false;
    // Ensure cart.items is an array
    if (!Array.isArray(cart.items)) { return res.status(400).json({ message: "Invalid cart items." }) }
    // Iterate over cart items and check for room
    cart.items.forEach(item => {
        const product = item.item;
        if (!product) { return }
        if (product.itemType === 'room') { containsRoom = true }
    });
    const order = await OrderService.createOrder(userId, cart, paymentMethod, orderNote);
    if (paymentMethod === 'online' && order.paymentFailed) { return res.status(400).json({ message: "Payment failed. Please try again." }) }
    let successMessage;
    if (paymentMethod === 'online') {
        successMessage = containsRoom
            ? CONSTANTS.PAYMENT_SUCCESS_ONLINE_HOTEL_MSG
            : CONSTANTS.PAYMENT_SUCCESS_ONLINE_ORDER_MSG;
    } else {
        successMessage = containsRoom
            ? CONSTANTS.HOTEL_BOOKED_MSG
            : CONSTANTS.ORDER_PLACED_MSG;
    }
    return res.status(201).json({
        message: successMessage,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress
    });
});

// Get the current user's orders
const getUserOrders = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const orders = await OrderService.getOrdersByUser(userId);
    res.status(200).json({ data: orders });
});

// Get order details by ID
const getOrderById = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    // Fetch the order by ID, populate the items with product details
    const order = await OrderService.getOrderById(orderId);
    if (!order) { return res.status(404).json({ message: CONSTANTS.ORDER_NOT_FOUND }) }
    // Return detailed order information to display on the order details page
    return res.status(200).json({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        totalPrice: order.totalPrice,
        subtotal: order.subtotal,
        tax: order.tax,
        items: order.items.map(item => ({
            productId: item.product._id,
            productName: item.product.productName || item.product.dishName,
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize || null,
            selectedColor: item.selectedColor || null
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    });
});

// Update Status
const updateOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    try {
        const order = await OrderService.updateOrderStatus(orderId, status);
        return res.status(200).json({
            message: CONSTANTS.ORDER_STATUS_UPDATE,
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            status: order.status
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// Cancel an order
const cancelOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await OrderModel.findById(orderId);
    if (!order) { return res.status(404).json({ message: CONSTANTS.ORDER_NOT_FOUND }) }
    if (order.status === 'delivered') { return res.status(400).json({ message: CONSTANTS.CANCEL_AFTER_DELIVERED_ERROR }) }
    order.status = 'cancelled';
    order.cancellationReason = reason;
    await order.save();
    return res.status(200).json({
        message: CONSTANT.ORDER_CANCELLED,
        orderId: order.orderId,
        status: order.status,
        cancellationReason: order.cancellationReason
    });
});

// Track order status
const trackOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const order = await OrderService.trackOrder(orderId);
    if (!order) { return res.status(404).json({ message: CONSTANTS.ORDER_NOT_FOUND }) }
    res.status(200).json({ data: order });
});

module.exports = {
    createOrder,
    updateOrderStatus,
    getUserOrders,
    getOrderById,
    cancelOrder,
    trackOrder,
};