const catchAsync = require('../utils/catchAsync');
const { OrderService } = require('../services');
const { CartModel, OrderModel } = require('../models');
const CONSTANTS = require('../config/constant');
const pick = require("../utils/pick");

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
        _id: order._id,
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
    const order = await OrderService.getOrderById(orderId);
    if (!order) { return res.status(404).json({ message: CONSTANTS.ORDER_NOT_FOUND }) }
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
            productId: item.item._id,
            itemType: item.item.itemType,
            productName: item.item.productName || item.item.dishName,
            quantity: item.quantity,
            price: item.price,
            selectedSize: item.selectedSize || null,
            selectedColor: item.selectedColor || null
        })),
        user: {
            userId: order.user._id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone
        },
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
        message: CONSTANTS.ORDER_CANCELLED,
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

const getAllOrdersAdmin = catchAsync(async (req, res) => {
    const options = pick(req.query, [
        'sortBy',
        'limit',
        'page',
        'searchBy',
        'categoryId',
        'orderId',
        'status'
    ]);
    const result = await OrderService.queryOrder(options);
    const orders = result.docs.map(order => ({
        orderId: order.orderId,
        userName: order.user.name,
        email: order.user.email,
        createdAt: order.createdAt,
        status: order.status,
        totalPrice: order.totalPrice
    }));
    res.send({
        data: {
            docs: orders,
            totalDocs: result.totalDocs,
            limit: result.limit,
            totalPages: result.totalPages,
            page: result.page,
            pagingCounter: result.pagingCounter,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevPage: result.prevPage,
            nextPage: result.nextPage
        },
        code: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.LIST
    });
});

const getOrdersByUserIdAdmin = catchAsync(async (req, res) => {
    const { userId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    const { orders, totalOrders } = await OrderService.getOrdersByUserIdAdmin(
        userId,
        search,
        sortBy,
        sortOrder,
        parseInt(page),
        parseInt(limit)
    );
    if (!orders || orders.length === 0) { return res.status(404).json({ message: CONSTANTS.ORDER_NOT_FOUND }) }
    res.status(200).json({
        data: orders,
        totalOrders,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit),
    });
});

module.exports = {
    createOrder,
    updateOrderStatus,
    getUserOrders,
    getOrderById,
    cancelOrder,
    trackOrder,
    getAllOrdersAdmin,
    getOrdersByUserIdAdmin
};