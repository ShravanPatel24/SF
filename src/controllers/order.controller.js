const catchAsync = require('../utils/catchAsync');
const { OrderService } = require('../services');
const { CartModel, OrderModel } = require('../models');
const CONSTANTS = require('../config/constant');
const pick = require("../utils/pick");

// Create a new order
const createOrder = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { cartId, paymentMethod, orderNote, deliveryAddress } = req.body;

    const cart = await CartModel.findById(cartId).populate({
        path: 'items.item',
        strictPopulate: false,
    });

    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ statusCode: 400, message: CONSTANTS.CART_EMPTY });
    }

    // Validate the delivery address for applicable item types
    const itemTypes = new Set(cart.items.map(item => item.item?.itemType));
    const requiresDeliveryAddress = itemTypes.has('food') || itemTypes.has('product');

    if (requiresDeliveryAddress) {
        if (
            !deliveryAddress ||
            !deliveryAddress.street ||
            !deliveryAddress.city ||
            !deliveryAddress.postalCode
        ) {
            return res
                .status(400)
                .json({ statusCode: 400, message: CONSTANTS.DELIVERY_ADDRESS_REQUIRED });
        }
    }

    // Create the order
    const order = await OrderService.createOrder(
        userId,
        cart,
        paymentMethod,
        orderNote,
        requiresDeliveryAddress ? deliveryAddress : null
    );

    if (paymentMethod === 'online' && order.paymentFailed) {
        return res.status(400).json({
            statusCode: 400,
            message: 'Payment failed. Please try again.',
        });
    }

    // Determine the success message based on item types
    let successMessage = '';
    if (itemTypes.has('room')) {
        successMessage =
            paymentMethod === 'online'
                ? CONSTANTS.PAYMENT_SUCCESS_ONLINE_HOTEL_MSG
                : 'Your hotel reservation request has been submitted. Please await confirmation.';
    } else if (itemTypes.has('food') && itemTypes.has('product')) {
        successMessage = 'Your order with food and products has been placed successfully!';
    } else if (itemTypes.has('food')) {
        successMessage = 'Your food order has been placed successfully and is awaiting preparation.';
    } else if (itemTypes.has('product')) {
        successMessage = 'Your product order has been placed successfully! It will be dispatched soon.';
    } else {
        successMessage = CONSTANTS.ORDER_PLACED_MSG;
    }

    return res.status(201).json({
        statusCode: 201,
        message: successMessage,
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        commission: order.commission,
        tax: order.tax,
        deliveryCharge: order.deliveryCharge,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        deliveryAddress: order.deliveryAddress,
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
    if (!order) {
        return res.status(404).json({ statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND });
    }
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
        deliveryPartner: {
            name: order.deliveryPartner?.name || null,
            phone: order.deliveryPartner?.phone || null
        },
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
const getPendingFoodRequests = catchAsync(async (req, res) => {
    const partnerId = req.user._id; // From auth middleware
    const requests = await OrderService.getPendingFoodRequests(partnerId);
    res.status(200).json({
        statusCode: 200,
        data: requests,
        message: "Pending food orders retrieved successfully",
    });
});

const getPendingRoomRequests = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const requests = await OrderService.getPendingRoomRequests(partnerId);
    res.status(200).json({
        statusCode: 200,
        data: requests,
        message: "Pending room requests retrieved successfully",
    });
});

const getPendingProductRequests = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const requests = await OrderService.getPendingProductRequests(partnerId);
    res.status(200).json({
        statusCode: 200,
        data: requests,
        message: "Pending product requests retrieved successfully",
    });
});

// Get order by status for the partner
const getOrdersByTypeAndStatus = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { itemType, orderStatus } = req.query;  // Accept itemType and orderStatus as query params

    const validStatuses = ["pending", "accepted", "rejected", "ordered", "processing", "out_for_delivery", "pending_payment", "paid", "payment_failed", "delivered", "cancelled"];

    // Check if the provided orderStatus is valid
    if (orderStatus && !validStatuses.includes(orderStatus)) {
        return res.status(400).json({
            statusCode: 400,
            message: `Invalid order status. Valid statuses are: ${validStatuses.join(", ")}`
        });
    }

    const orders = await OrderService.getOrdersByStatus(partnerId, itemType, orderStatus);
    return res.status(200).json({
        statusCode: 200,
        data: orders,
        message: `${orderStatus ? `${orderStatus} ` : ""}${itemType ? `${itemType} ` : ""}orders retrieved successfully`
    });
});

// Accept or Reject the order
const updatePartnerRequestStatus = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { partnerResponse } = req.body;  // 'accepted' or 'rejected'
    const partnerId = req.user._id;  // Assuming the partner is authenticated

    try {
        const updatedOrder = await OrderService.updatePartnerRequestStatus(orderId, partnerId, partnerResponse);
        return res.status(200).json({
            statusCode: 200,
            message: `Request ${partnerResponse} successfully`,
            order: {
                _id: updatedOrder._id,
                status: updatedOrder.orderStatus,  // Use `orderStatus` to reflect the updated status
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

// Get Partner Refund Details
const getPartnerRefunds = catchAsync(async (req, res) => {
    const partnerId = req.user._id; // Get the partner ID from the authenticated user
    const { page, limit, status, search, sortBy, sortOrder } = req.query;

    const refunds = await OrderService.getPartnerRefunds(partnerId, { page, limit, status, search, sortBy, sortOrder });

    res.status(200).json({
        statusCode: 200,
        message: 'Refunds retrieved successfully',
        data: refunds,
    });
});

// Get Admin Refund Details
const getRefundDetails = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc', fromDate, toDate } = req.query;

    try {
        const refunds = await OrderService.getRefundDetails({ page, limit, status, search, sortBy, sortOrder, fromDate, toDate });

        res.status(200).json({
            statusCode: 200,
            message: 'Refund details fetched successfully',
            data: refunds
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An error occurred while fetching refund details.'
        });
    }
});

const requestRefundOrExchange = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { itemIds, reason, action, bankDetails } = req.body;
    const processedBy = req.user._id;

    // Check if the requester is a user
    if (req.user.type !== 'user') {
        return res.status(403).json({
            statusCode: 403,
            message: "Only users can request a refund or exchange from partners."
        });
    }

    try {
        const order = await OrderService.requestRefundOrExchange(orderId, itemIds, reason, action, processedBy, bankDetails);
        res.status(200).json({
            statusCode: 200,
            message: `${action.charAt(0).toUpperCase() + action.slice(1)} requested successfully`,
            data: order
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || `An error occurred while requesting a ${action}.`
        });
    }
});

const processRefundOrExchangeDecision = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { decision, action } = req.body; // 'accept' or 'reject'
    const partnerId = req.user._id;

    try {
        const result = await OrderService.processRefundOrExchangeDecision(orderId, decision, action, partnerId);
        res.status(200).json({
            statusCode: 200,
            message: `${action.charAt(0).toUpperCase() + action.slice(1)} ${decision}ed successfully`,
            data: result,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || `An error occurred while processing the ${action} decision.`,
        });
    }
});

// Admin API to Update Refund
const updateRefundStatusByAdmin = catchAsync(async (req, res) => {
    const { orderId } = req.body;
    const { status, approvedDate, adminReason } = req.body;

    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            statusCode: 400,
            message: `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`
        });
    }

    const order = await OrderModel.findOneAndUpdate(
        { _id: orderId, 'refundDetails.status': 'pending_admin' },
        {
            'refundDetails.status': status,
            'refundDetails.approvedDate': approvedDate || new Date(),
            'refundDetails.adminReason': adminReason
        },
        { new: true }
    );

    if (!order) {
        return res.status(404).json({ statusCode: 404, message: "Order or refund not found" });
    }

    return res.status(200).json({
        statusCode: 200,
        message: `Refund ${status} by admin successfully.`,
        data: order
    });
});

// Get Partner Transactions
const getPartnerTransactionList = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { filter, page = 1, limit = 10 } = req.query;

    try {
        const transactions = await OrderService.getPartnerTransactionList(partnerId, filter, parseInt(page), parseInt(limit));
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ statusCode: 500, message: error.message });
    }
});

module.exports = {
    createOrder,
    updateOrderStatus,
    getUserOrders,
    getOrderById,
    getPendingFoodRequests,
    getPendingRoomRequests,
    getPendingProductRequests,
    getOrdersByTypeAndStatus,
    updatePartnerRequestStatus,
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
    getPartnerRefunds,
    getRefundDetails,
    requestRefundOrExchange,
    processRefundOrExchangeDecision,
    updateRefundStatusByAdmin,
    getPartnerTransactionList
};