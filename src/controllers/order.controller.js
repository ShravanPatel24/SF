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
    const { page = 1, limit = 10, sortOrder = "desc" } = req.query;

    const orders = await OrderService.getOrdersByUser(
        userId,
        parseInt(page),
        parseInt(limit),
        sortOrder
    );

    return res.status(200).json({
        statusCode: 200,
        message: "List retrieved successfully.",
        data: {
            docs: orders.docs,
            totalDocs: orders.totalDocs,
            limit: orders.limit,
            totalPages: orders.totalPages,
            page: orders.page,
            pagingCounter: orders.pagingCounter,
            hasPrevPage: orders.hasPrevPage,
            hasNextPage: orders.hasNextPage,
            prevPage: orders.prevPage,
            nextPage: orders.nextPage,
        },
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
        deliveryCharge: order.deliveryCharge, // Include delivery charge
        commission: order.commission, // Include commission
        businessDetails: order.businessDetails,
        items: order.items, // Properly mapped items array
        deliveryPartner: order.deliveryPartner,
        partner: {
            partnerId: order.partner._id,
            name: order.partner.name,
            email: order.partner.email,
            phone: order.partner.phone,
        },
        user: {
            userId: order.user._id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone,
        },
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
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
    const { page = 1, limit = 10, sortOrder = "desc" } = req.query;

    const requests = await OrderService.getPendingFoodRequests(partnerId, parseInt(page), parseInt(limit), sortOrder);
    res.status(200).json({
        statusCode: 200,
        message: "Pending food orders retrieved successfully",
        data: requests,
    });
});

const getPendingRoomRequests = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { page = 1, limit = 10, sortOrder = "desc" } = req.query;

    const requests = await OrderService.getPendingRoomRequests(partnerId, parseInt(page), parseInt(limit), sortOrder);
    res.status(200).json({
        statusCode: 200,
        message: "Pending room requests retrieved successfully",
        data: requests,
    });
});

const getPendingProductRequests = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { page = 1, limit = 10, sortOrder = "desc" } = req.query;

    const requests = await OrderService.getPendingProductRequests(partnerId, parseInt(page), parseInt(limit), sortOrder);
    res.status(200).json({
        statusCode: 200,
        message: "Pending product requests retrieved successfully",
        data: requests,
    });
});

// Get order by status for the partner
const getOrdersByTypeAndStatus = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { itemType, orderStatus } = req.query;  // Accept itemType and orderStatus as query params

    const validStatuses = ["pending", "accepted", "rejected", "ordered", "processing", "out_for_delivery", "pending_payment", "paid", "payment_failed", "delivered", "cancelled", "completed"];

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

    const order = await OrderService.cancelOrder(orderId, reason);

    return res.status(200).json({
        statusCode: 200,
        message: "Order cancelled successfully.",
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        cancellationReason: order.cancellationReason,
        cancellationDate: order.cancellationDate,
        items: order.items, // Include enriched items data
    });
});

// Get list of completed bookings
const getCompletedBookingsController = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const bookings = await OrderService.getCompletedBookings(userId);

    res.status(200).json({
        statusCode: 200,
        message: "Completed bookings fetched successfully.",
        bookings,
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
        orderStatus: order.orderStatus || 'N/A',

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
    const { status, page = 1, limit = 10, sortOrder = "desc" } = req.query;
    const userId = req.user._id;

    const history = await OrderService.getHistoryByCategory(
        userId,
        category,
        status,
        parseInt(page, 10),
        parseInt(limit, 10),
        sortOrder
    );

    return res.status(200).json({
        statusCode: 200,
        message: `${category.charAt(0).toUpperCase() + category.slice(1)} history retrieved successfully.`,
        data: history.data,
        totalDocs: history.totalDocs,
        totalPages: history.totalPages,
        page: history.page,
        limit: history.limit,
    });
});

const getAllHistory = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { sortOrder = "desc" } = req.query;

    const history = await OrderService.getAllHistory(userId, sortOrder);

    res.status(200).json({
        statusCode: 200,
        data: history,
    });
});

const getAllTransactionHistory = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, itemType, status, search, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = req.query;

    try {
        const orderSummaries = await OrderService.getAllTransactionHistory({ page, limit, itemType, status, search, sortBy, sortOrder, startDate, endDate });

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

// Get refund details for partner
const getApprovedRefunds = catchAsync(async (req, res) => {
    const partnerId = req.user._id; // Partner ID from authentication middleware
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const refunds = await OrderService.getApprovedRefundsByPartner(partnerId, {
        page: parsedPage,
        limit: parsedLimit,
        sortBy,
        sortOrder,
    });

    res.status(200).json({
        statusCode: 200,
        message: "Approved refunds retrieved successfully",
        data: refunds,
    });
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

// Get User and Partner Transactions
const getTransactionHistoryForUserAndPartner = catchAsync(async (req, res) => {
    const { filter, page = 1, limit = 10 } = req.query;
    const { type } = req.user; // `type` will be 'user' or 'partner' from authentication middleware
    const userIdOrPartnerId = req.user._id;

    try {
        const transactions = await OrderService.getTransactionHistoryForUserAndPartner({
            type,
            id: userIdOrPartnerId,
            filter,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        });

        res.status(200).json({
            statusCode: 200,
            message: `${type === 'partner' ? 'Partner' : 'User'} transaction history retrieved successfully`,
            data: transactions,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'Internal server error',
        });
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
    getCompletedBookingsController,
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
    getApprovedRefunds,
    updateRefundStatusByAdmin,
    getTransactionHistoryForUserAndPartner
};