const { OrderModel, CartModel } = require('../models');
const CONSTANTS = require('../config/constant');
const mongoose = require('mongoose');

// Create a new order
const createOrder = async (userId, cartId, paymentMethod, orderNote) => {
    const customOrderId = Math.floor(Date.now() / 1000).toString();
    const orderNumber = `#${customOrderId}`;

    // Fetch the cart
    const cart = await CartModel.findById(cartId).populate({
        path: 'items.item',
        populate: { path: 'partner', select: '_id name' }
    });

    if (!cart || cart.items.length === 0) {
        throw new Error(CONSTANTS.CART_EMPTY);
    }

    const firstItem = cart.items[0].item;
    const partnerId = firstItem.partner._id;

    // Initialize the transaction history
    const transactionHistory = [{
        type: "Order Placed",
        date: new Date(),
        amount: cart.totalPrice,
        status: "Completed"
    }];

    // Create the order
    const order = new OrderModel({
        user: userId,
        partner: partnerId,
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
        orderStatus: 'pending',
        transactionHistory: transactionHistory
    });

    await order.save();

    if (paymentMethod === 'online') {
        const paymentResult = await processOnlinePayment(order);
        if (!paymentResult.success) {
            order.orderStatus = 'payment_failed';
            await order.save();
            throw new Error(CONSTANTS.PAYMENT_FAILED);
        }
        order.orderStatus = 'paid';
        order.transactionHistory.push({
            type: "Payment Completed",
            date: new Date(),
            amount: order.totalPrice,
            status: "Completed"
        });
        await order.save();
    }

    cart.items = [];
    cart.totalPrice = 0;
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


const updateOrderStatus = async (orderId, orderStatus) => {
    const order = await OrderModel.findById(orderId);
    if (!order) throw { statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND };

    if (order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') {
        throw { statusCode: 400, message: CONSTANTS.UPDATE_STATUS_AFTER_DELIVERD_ERROR };
    }

    // Update order status and add to transaction history
    order.orderStatus = orderStatus;
    order.transactionHistory.push({
        type: `Order ${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}`,  // Capitalize status
        date: new Date(),
        amount: order.totalPrice,
        status: "Completed"
    });

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
        .populate('items.item')
        .populate('orderStatus');
    return order;
};

// Get pending food orders for the partner
const getPendingFoodOrders = async (partnerId) => {
    const orders = await OrderModel.find({
        partner: partnerId,
        orderStatus: 'pending',  // Assuming 'pending' means not yet accepted/rejected
    }).populate('items.item'); // Populate the related items
    return orders;
};

// Update the order status (Accept or Reject)
const updatePartnerOrderStatus = async (orderId, partnerId, partnerResponse) => {
    const order = await OrderModel.findOne({ _id: orderId, partner: partnerId });

    if (!order) {
        throw new Error("Order not found");
    }

    if (order.orderStatus !== 'pending') {
        throw new Error("Order is no longer in pending state");
    }

    if (partnerResponse === 'accepted') {
        order.orderStatus = 'ordered';
        order.partnerResponse = 'accepted';
    } else if (partnerResponse === 'rejected') {
        order.orderStatus = 'rejected';
        order.partnerResponse = 'rejected';
    } else {
        throw new Error("Invalid response");
    }

    await order.save();
    return order;
};

// Update delivery partner 
const updateDeliveryPartner = async (orderId, deliveryPartner) => {
    const order = await OrderModel.findById(orderId);
    if (!order) throw new Error('Order not found');

    order.deliveryPartner = deliveryPartner;
    order.orderStatus = 'out_for_delivery'; // Change status to 'Out for Delivery'
    await order.save();

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
    const order = await OrderModel.findById(orderId)
        .populate({
            path: 'items.item',
            select: 'itemType dishName productName, productDescription images',
        })
        .populate('user', 'name email')
        .populate('partner', 'name businessName');

    order.items = order.items.map(item => {
        const itemData = item.item;
        let itemName = '';
        if (itemData.itemType === 'food') {
            itemName = itemData.dishName;
        } else if (itemData.itemType === 'product') {
            itemName = itemData.productName && itemData.productDescription;
        }

        return {
            ...item.toObject(),
            item: {
                ...itemData.toObject(),
                itemName,
            },
        };
    });

    return order;
};

// Get Orders Of All Users
const queryOrder = async (options) => {
    var matchCondition = {};
    // Filter by userId
    if (options.userId && options.userId !== 'undefined') { matchCondition.user = new mongoose.Types.ObjectId(String(options.userId)) }
    // Filter by partnerId
    if (options.partnerId && options.partnerId !== 'undefined') { matchCondition.partner = new mongoose.Types.ObjectId(String(options.partnerId)) }

    // Filter by search query (orderId, user name, or email)
    if (options.search && options.search !== 'undefined') {
        matchCondition.$or = [
            { orderId: { $regex: '.*' + options.search + '.*', $options: 'i' } },
            { 'userDetails.name': { $regex: '.*' + options.search + '.*', $options: 'i' } },
            { 'userDetails.email': { $regex: '.*' + options.search + '.*', $options: 'i' } }
        ];
    }
    // Filter by status
    if (options.status && options.status !== 'undefined') { matchCondition.status = options.status }
    // Aggregation pipeline
    const aggregateQuery = [
        {
            $lookup: {
                from: 'users', // Join with the users collection for user details
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        { $unwind: '$userDetails' },
        {
            $lookup: {
                from: 'users', // Join with the users collection for partner details
                localField: 'partner',
                foreignField: '_id',
                as: 'partnerDetails'
            }
        },
        { $unwind: { path: '$partnerDetails', preserveNullAndEmptyArrays: true } }, // Unwind partnerDetails
        { $match: matchCondition }, // Apply match condition here
        {
            $lookup: {
                from: 'items', // Join with the items collection for item details
                localField: 'items.item',
                foreignField: '_id',
                as: 'itemDetails'
            }
        }
    ];
    // If filtering by itemType, add a match for itemType inside items
    if (options.itemType && options.itemType !== 'undefined') {
        aggregateQuery.push({
            $match: {
                'itemDetails.itemType': options.itemType
            }
        });
    }
    // Apply sorting
    const sortOption = {};
    if (options.sortBy && options.sortBy !== 'undefined') {
        sortOption[options.sortBy] = options.sortOrder === 'asc' ? 1 : -1;
    } else {
        sortOption['createdAt'] = -1;
    }
    aggregateQuery.push({ $sort: sortOption });

    const aggregateQueryPipeline = OrderModel.aggregate(aggregateQuery);
    const data = await OrderModel.aggregatePaginate(aggregateQueryPipeline, { page: options.page || 1, limit: options.limit || 10 });
    return data;
};

// Get Orders Of Users By userId
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

// Get Orders Of Partner By partnerId
const getOrdersByPartnerId = async (partnerId, search = '', itemType = '', sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10) => {
    const query = { partner: partnerId };

    if (search) {
        query.$or = [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'orderId': { $regex: search, $options: 'i' } }
        ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const orders = await OrderModel.find(query)
        .populate({
            path: 'items.item',
            match: itemType ? { itemType: itemType } : {},
            populate: [
                { path: 'partner', select: 'name email' },
                { path: 'business', select: 'businessName status' },
                { path: 'businessType', select: 'name' }
            ]
        })
        .populate('user', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit);

    const filteredOrders = orders.filter(order => order.items.some(item => item.item));
    const totalOrders = filteredOrders.length;

    return { orders: filteredOrders, totalOrders };
};

const getTransactionHistoryByOrderId = async (orderId) => {
    const order = await OrderModel.findById(orderId)
        .populate('user', 'name email phone')
        .populate('partner', 'name email')
        .populate({
            path: 'items.item',
            populate: {
                path: 'business businessType',
                select: 'businessName name'
            }
        })
        .select('transactionHistory refundStatus totalPrice subtotal tax deliveryCharge orderStatus paymentMethod deliveryAddress orderNote createdAt updatedAt items');

    if (!order) {
        throw new Error(CONSTANTS.ORDER_NOT_FOUND);
    }

    // Filter transaction history for refund details only if item type is 'product'
    const filteredTransactionHistory = order.transactionHistory.map(transaction => {
        if (transaction.type === "Refund Requested") {
            // Check if refund request is for a product item
            const isProductItem = order.items.some(item => item.item.itemType === 'product');
            if (isProductItem) {
                return {
                    type: transaction.type,
                    date: transaction.date,
                    amount: transaction.amount,
                    status: transaction.status,
                    refundDetails: transaction.refundDetails || {}
                };
            }
            // Exclude refund details for non-product items
            return null;
        }
        return transaction;
    }).filter(Boolean);

    return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        user: order.user,
        partner: order.partner,
        items: order.items.map(item => ({
            itemId: item.item._id,
            itemType: item.item.itemType,
            name: item.item.productName || item.item.dishName || item.item.roomName,
            description: item.item.productDescription || item.item.dishDescription || item.item.roomDescription,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize || null,
            selectedColor: item.selectedColor || null
        })),
        totalPrice: order.totalPrice,
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryCharge: order.deliveryCharge,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        refundStatus: order.refundStatus,
        deliveryAddress: order.deliveryAddress,
        orderNote: order.orderNote,
        transactionHistory: filteredTransactionHistory,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
    };
};

const getAllTransactionHistory = async ({ page, limit }) => {
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        select: 'orderId transactionHistory refundStatus totalPrice user partner',
        sort: { createdAt: -1 }
    };

    const orderSummaries = await OrderModel.paginate({}, options);

    return orderSummaries;
};

const requestRefundForItems = async (orderId, itemIds, reason, processedBy, bankDetails) => {
    const order = await OrderModel.findById(orderId).populate('items.item');
    if (!order) throw new Error(CONSTANTS.ORDER_NOT_FOUND);

    const exactRefundAmount = order.items
        .filter(item => itemIds.includes(item.item._id.toString()) && item.item.itemType === 'product')
        .reduce((total, item) => {
            let price;
            if (item.item.itemType === 'product') {
                const variant = item.item.variants.find(v =>
                    v.size === item.selectedSize && v.color === item.selectedColor
                );
                if (variant) {
                    price = variant.productPrice;
                } else {
                    throw new Error("Variant not found for selected options during refund calculation.");
                }
            } else {
                price = item.item.dishPrice || item.item.roomPrice;
            }
            if (!price) throw new Error("Price not found for item during refund calculation.");
            return total + (price * item.quantity);
        }, 0);

    if (isNaN(exactRefundAmount) || exactRefundAmount <= 0) {
        throw new Error("Invalid refund amount calculated.");
    }

    order.refundStatus = 'pending';
    order.transactionHistory.push({
        type: "Refund Requested",
        date: new Date(),
        amount: exactRefundAmount,
        status: "pending",
        refundDetails: {
            reason: reason,
            processedBy: processedBy,
            items: itemIds,
            bankDetails
        }
    });

    await order.save();
    return order;
};

const processRefundDecision = async (orderId, decision, partnerId, bankDetails = {}) => {
    const order = await OrderModel.findOne({ _id: orderId, partner: partnerId });
    if (!order) throw new Error("Order not found or unauthorized access");

    // Flatten transactionHistory array if needed
    const flatTransactionHistory = order.transactionHistory.flat();

    const lastTransaction = flatTransactionHistory
        .filter(th => th && th.type && th.type === "Refund Requested")
        .pop();

    if (!lastTransaction || lastTransaction.status !== "pending") {
        throw new Error("Refund request is either not pending or already processed.");
    }

    const isAccepted = decision === 'accept';
    order.refundStatus = isAccepted ? 'approved' : 'rejected';

    // Add a new transaction history entry for the refund decision
    order.transactionHistory.push({
        type: `Refund ${isAccepted ? 'Approved' : 'Rejected'}`,
        date: new Date(),
        amount: lastTransaction.amount,
        status: isAccepted ? 'Completed' : 'Rejected',
        refundDetails: isAccepted ? {
            bankDetails: lastTransaction.refundDetails.bankDetails,
            reason: lastTransaction.refundDetails.reason
        } : {}
    });

    await order.save();
    return order;
};

// New Functions for Return/Exchange Functionality

const initiateReturnOrExchange = async (orderId, itemIds, reason, action, processedBy) => {
    const order = await OrderModel.findById(orderId).populate('items.item');
    if (!order) throw new Error(CONSTANTS.ORDER_NOT_FOUND);

    // Ensure transactionHistory is initialized as an array
    if (!Array.isArray(order.transactionHistory)) {
        order.transactionHistory = [];
    }

    order.transactionHistory.push({
        type: action === 'exchange' ? 'Exchange Requested' : 'Return Requested',
        date: new Date(),
        amount: order.totalPrice,
        status: "pending",
        returnDetails: {
            reason: reason,
            processedBy: processedBy,
            action: action,
            items: itemIds
        }
    });

    await order.save();
    return order;
};

const processReturnDecision = async (orderId, decision, partnerId) => {
    const order = await OrderModel.findOne({ _id: orderId, partner: partnerId });
    if (!order) throw new Error("Order not found or unauthorized access");

    const lastTransaction = order.transactionHistory
        .filter(th => th.type.startsWith("Return") || th.type.startsWith("Exchange"))
        .pop();

    if (!lastTransaction || lastTransaction.status !== "pending") {
        throw new Error("Return/Exchange request is either not pending or already processed.");
    }

    const isAccepted = decision === 'accept';
    order.returnStatus = isAccepted ? 'approved' : 'rejected';

    order.transactionHistory.push({
        type: `${lastTransaction.type.split(' ')[0]} ${isAccepted ? 'Approved' : 'Rejected'}`,
        date: new Date(),
        amount: lastTransaction.amount,
        status: isAccepted ? 'Completed' : 'Rejected',
    });

    await order.save();
    return order;
};

module.exports = {
    createOrder,
    processOnlinePayment,
    updateOrderStatus,
    getOrdersByUser,
    getOrderById,
    getPendingFoodOrders,
    updatePartnerOrderStatus,
    updateDeliveryPartner,
    cancelOrder,
    trackOrder,
    queryOrder,
    getOrdersByUserIdAdmin,
    getOrdersByPartnerId,
    getTransactionHistoryByOrderId,
    getAllTransactionHistory,
    requestRefundForItems,
    processRefundDecision,
    initiateReturnOrExchange,
    processReturnDecision,
};