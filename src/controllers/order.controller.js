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
    if (!cart || cart.items.length === 0) { return res.status(400).json({ statusCode: 400, message: CONSTANTS.CART_EMPTY }) }
    let containsRoom = false;
    if (!Array.isArray(cart.items)) { return res.status(400).json({ statusCode: 400, message: "Invalid cart items." }) }

    cart.items.forEach(item => {
        const product = item.item;
        if (!product) { return; }
        if (product.itemType === 'room') { containsRoom = true; }
    });

    const order = await OrderService.createOrder(userId, cart, paymentMethod, orderNote);

    if (paymentMethod === 'online' && order.paymentFailed) { return res.status(400).json({ statusCode: 400, message: "Payment failed. Please try again." }) }

    let successMessage = paymentMethod === 'online' ?
        (containsRoom ? CONSTANTS.PAYMENT_SUCCESS_ONLINE_HOTEL_MSG : CONSTANTS.PAYMENT_SUCCESS_ONLINE_ORDER_MSG) :
        (containsRoom ? CONSTANTS.HOTEL_BOOKED_MSG : CONSTANTS.ORDER_PLACED_MSG);

    return res.status(201).json({
        statusCode: 201,
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
    return res.status(200).json({
        statusCode: 200,
        data: orders
    });
});

// Get order details by ID
const getOrderById = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const order = await OrderService.getOrderById(orderId);
    if (!order) { return res.status(404).json({ statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND }) }
    return res.status(200).json({
        statusCode: 200,
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
        totalPrice: order.totalPrice,
        subtotal: order.subtotal,
        tax: order.tax,
        items: order.items.map(item => ({
            itemId: item.item._id,
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
    const { orderStatus } = req.body;
    try {
        const order = await OrderService.updateOrderStatus(orderId, orderStatus);
        return res.status(200).json({
            statusCode: 200,
            message: CONSTANTS.ORDER_STATUS_UPDATE,
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An error occurred while updating the order status.'
        });
    }
});

// Get pending food orders for the partner
const getPartnerFoodRequests = catchAsync(async (req, res) => {
    const partnerId = req.user._id; // From auth middleware
    const orders = await OrderService.getPendingFoodOrders(partnerId); // Call service method
    res.status(200).json({
        statusCode: 200,
        data: orders,
        message: "Pending food orders retrieved successfully",
    });
});

// Accept or Reject the order
const updatePartnerOrderStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { partnerResponse } = req.body;  // 'accepted' or 'rejected'
    const partnerId = req.user._id;  // Assuming the partner is authenticated

    try {
        const updatedOrder = await OrderService.updatePartnerOrderStatus(orderId, partnerId, partnerResponse);
        return res.status(200).json({
            statusCode: 200,
            message: "Order status updated successfully",
            order: {
                _id: updatedOrder._id,
                status: updatedOrder.status,
                partnerResponse: updatedOrder.partnerResponse
            }
        });
    } catch (error) {
        return res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Update delivery partner 
const updateDeliveryPartner = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { name, phone } = req.body;

    const order = await OrderService.updateDeliveryPartner(orderId, { name, phone });
    if (!order) return res.status(404).json({ statusCode: 404, message: 'Order not found' });

    return res.status(200).json({
        statusCode: 200,
        message: 'Delivery partner information updated successfully',
        data: order
    });
});

// Cancel an order
const cancelOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await OrderModel.findById(orderId);
    if (!order) {
        return res.status(404).json({ statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND });
    }
    if (order.status === 'delivered') {
        return res.status(400).json({ statusCode: 400, message: CONSTANTS.CANCEL_AFTER_DELIVERED_ERROR });
    }
    order.status = 'cancelled';
    order.cancellationReason = reason;
    await order.save();
    return res.status(200).json({
        statusCode: 200,
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
    if (!order) {
        return res.status(404).json({ statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND });
    }
    return res.status(200).json({
        statusCode: 200,
        data: order
    });
});

// Get Orders Of All Users
const getAllOrdersAdmin = catchAsync(async (req, res) => {
    const options = pick(req.query, [
        'sortBy',
        'limit',
        'page',
        'search',
        'categoryId',
        'orderId',
        'status',
        'itemType',
        'sortOrder',
        'userId',
        'partnerId'
    ]);
    const result = await OrderService.queryOrder(options);
    const orders = result.docs.map(order => ({
        _id: order._id,
        orderId: order.orderId,
        userId: order.userDetails?._id || 'N/A',
        partnerId: order.partnerDetails?._id || 'N/A',
        userName: order.userDetails?.name || 'N/A',
        email: order.userDetails?.email || 'N/A',
        createdAt: order.createdAt,
        status: order.status,
        totalPrice: order.totalPrice,
        itemTypes: order.itemDetails ? order.itemDetails.map(item => item.itemType).filter(Boolean) : []
    }));

    return res.status(200).json({
        statusCode: 200,
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
        message: CONSTANTS.LIST
    });
});

// Get Orders Of Users By userId
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
    if (!orders || orders.length === 0) {
        return res.status(404).json({ statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND });
    }
    return res.status(200).json({
        statusCode: 200,
        data: orders,
        totalOrders,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit)
    });
});

// Get Orders Of Partner By partnerId
const getOrdersByPartnerId = catchAsync(async (req, res) => {
    const { partnerId } = req.params;
    const { search, itemType, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const { orders, totalOrders } = await OrderService.getOrdersByPartnerId(
        partnerId,
        search,
        itemType,
        sortBy,
        sortOrder,
        parseInt(page),
        parseInt(limit)
    );
    if (!orders || orders.length === 0) { return res.status(404).json({ statusCode: 404, message: 'No orders found for this partner.' }) }
    const formattedOrders = orders.map(order => ({
        user: order.user,
        partner: {
            name: order.items[0]?.item?.partner?.name || 'Unknown',
            email: order.items[0]?.item?.partner?.email || 'Unknown',
            id: order.items[0]?.item?.partner?._id || 'Unknown'
        },
        business: {
            name: order.items[0]?.item?.business?.businessName || 'Unknown',
            status: order.items[0]?.item?.business?.status || 'Unknown'
        },
        businessType: order.items[0]?.item?.businessType?.name || 'Unknown',
        items: order.items
            .filter(item => item.item)
            .map(item => {
                const product = item.item;
                let itemDetails = {
                    itemId: product._id,
                    itemType: product.itemType,
                    quantity: item.quantity,
                    selectedSize: item.selectedSize || null,
                    selectedColor: item.selectedColor || null
                };
                if (product.itemType === 'food') {
                    itemDetails.dishName = product.dishName;
                    itemDetails.dishDescription = product.dishDescription;
                    itemDetails.dishPrice = product.dishPrice;
                    itemDetails.foodDeliveryCharge = product.foodDeliveryCharge;
                } else if (product.itemType === 'product') {
                    itemDetails.productName = product.productName;
                    itemDetails.productDescription = product.productDescription;
                    itemDetails.productPrice = product.variants?.[0]?.productPrice;
                    itemDetails.variants = product.variants || [];
                    itemDetails.productFeatures = product.productFeatures || [];
                    itemDetails.productDeliveryCharge = product.productDeliveryCharge || [];
                } else if (product.itemType === 'room') {
                    itemDetails.roomName = product.roomName;
                    itemDetails.roomDescription = product.roomDescription;
                    itemDetails.roomPrice = product.roomPrice;
                    itemDetails.amenities = product.amenities || [];
                    itemDetails.checkIn = item.checkIn;
                    itemDetails.checkOut = item.checkOut;
                }

                return itemDetails;
            }),
        totalPrice: order.totalPrice,
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryCharge: order.deliveryCharge,
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    }));

    const totalPages = Math.ceil(totalOrders / limit);
    const pagingCounter = (page - 1) * limit + 1;
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    return res.status(200).json({
        statusCode: 200,
        data: {
            docs: formattedOrders,
            totalDocs: totalOrders,
            limit: limit,
            totalPages: totalPages,
            page: parseInt(page),
            pagingCounter: pagingCounter,
            hasPrevPage: hasPrevPage,
            hasNextPage: hasNextPage,
            prevPage: hasPrevPage ? page - 1 : null,
            nextPage: hasNextPage ? page + 1 : null
        },
        message: CONSTANTS.LIST
    });
});

const getTransactionHistoryByOrderId = catchAsync(async (req, res) => {
    const { orderId } = req.params;

    try {
        const orderData = await OrderService.getTransactionHistoryByOrderId(orderId);

        res.status(200).json({
            statusCode: 200,
            message: 'Transaction and refund history fetched successfully',
            data: orderData
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'Internal server error'
        });
    }
});

const getHistoryByCategory = catchAsync(async (req, res) => {
    const { category } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    const history = await OrderService.getHistoryByCategory(userId, category, status, parseInt(page), parseInt(limit));
    res.status(200).json(history);
});

const getAllHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const history = await OrderService.getAllHistory(userId);

        res.status(200).json({
            statusCode: 200,
            data: history
        });
    } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
    }
};

const getAllTransactionHistory = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, itemType, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    try {
        const orderSummaries = await OrderService.getAllTransactionHistory({ page, limit, itemType, status, search, sortBy, sortOrder });

        res.status(200).json({
            statusCode: 200,
            message: 'All transaction and refund summaries fetched successfully',
            data: orderSummaries
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'Internal server error'
        });
    }
});

const requestRefund = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { itemIds, reason, bankDetails } = req.body;
    const processedBy = req.user._id;

    try {
        const order = await OrderService.requestRefundForItems(orderId, itemIds, reason, processedBy, bankDetails);
        res.status(200).json({
            statusCode: 200,
            message: "Refund requested successfully",
            data: order
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An error occurred while requesting a refund.'
        });
    }
});

const respondToRefundRequest = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { decision } = req.body; // 'accept' or 'reject'
    const partnerId = req.user._id; // Assuming partner ID is taken from the auth token

    const result = await OrderService.processRefundDecision(orderId, decision, partnerId);

    res.status(200).json({
        statusCode: 200,
        message: `Refund ${decision}ed successfully`,
        data: result,
    });
});

const initiateReturnOrExchange = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { itemIds, reason, action } = req.body; // action can be 'exchange' or 'refund'
    const processedBy = req.user._id;

    try {
        const order = await OrderService.initiateReturnOrExchange(orderId, itemIds, reason, action, processedBy);
        res.status(200).json({
            statusCode: 200,
            message: `${action.charAt(0).toUpperCase() + action.slice(1)} requested successfully`,
            data: order
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An error occurred while initiating the return or exchange.'
        });
    }
});

const processReturnDecision = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { decision } = req.body; // 'accept' or 'reject'
    const partnerId = req.user._id;

    try {
        const result = await OrderService.processReturnDecision(orderId, decision, partnerId);
        res.status(200).json({
            statusCode: 200,
            message: `Return ${decision}ed successfully`,
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An error occurred while processing the return decision.'
        });
    }
});

module.exports = {
    createOrder,
    updateOrderStatus,
    getUserOrders,
    getOrderById,
    getPartnerFoodRequests,
    updatePartnerOrderStatus,
    updateDeliveryPartner,
    cancelOrder,
    trackOrder,
    getAllOrdersAdmin,
    getOrdersByUserIdAdmin,
    getOrdersByPartnerId,
    getHistoryByCategory,
    getAllHistory,
    getTransactionHistoryByOrderId,
    getAllTransactionHistory,
    requestRefund,
    respondToRefundRequest,
    initiateReturnOrExchange,
    processReturnDecision,
};