const { OrderModel, CartModel } = require('../models');
const CONSTANTS = require('../config/constant');
const mongoose = require('mongoose');

// Create a new order
const createOrder = async (userId, cartId, paymentMethod, orderNote) => {
    const customOrderId = Math.floor(Date.now() / 1000).toString();
    const orderNumber = `#${customOrderId}`;

    // Fetch the cart and ensure that the 'partner' field in each item is populated
    const cart = await CartModel.findById(cartId).populate({
        path: 'items.item',
        populate: { path: 'partner', select: '_id name' }  // Ensure partner is populated
    });

    if (!cart || cart.items.length === 0) {
        throw new Error(CONSTANTS.CART_EMPTY);
    }

    // Extract the partnerId from the first item in the cart
    const firstItem = cart.items[0].item;
    const partnerId = firstItem.partner._id;  // Extract the partner ID

    // Calculate the price for each item and prepare the order details
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

    // Create the order with the user, partner, and other details
    const order = new OrderModel({
        user: userId,
        partner: partnerId,  // Set the partner ID here
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
        orderStatus: 'pending'  // Set order status to 'pending' for both cash and online payments
    });

    await order.save();

    // Handle online payment only
    if (paymentMethod === 'online') {
        const paymentResult = await processOnlinePayment(order);

        if (!paymentResult.success) {
            console.log("Payment failed, marking the order as payment_failed.");
            order.orderStatus = 'payment_failed';  // Mark as payment failed
            await order.save();
            throw new Error(CONSTANTS.PAYMENT_FAILED);  // Optional: throw an error if you want to handle it further up the call stack
        }
        console.log("Payment successful, updating order status to paid.");
        order.orderStatus = 'paid';  // Update order status to paid
        await order.save();
    }

    // Clear the cart after the order is placed
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


const updateOrderStatus = async (orderId, orderStatus) => {
    const order = await OrderModel.findById(orderId);
    if (!order) { throw { statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND } }
    if (order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') { throw { statusCode: 400, message: CONSTANTS.UPDATE_STATUS_AFTER_DELIVERD_ERROR } }
    order.orderStatus = orderStatus;
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

module.exports = {
    createOrder,
    processOnlinePayment,
    updateOrderStatus,
    getOrdersByUser,
    getOrderById,
    getPendingFoodOrders,
    updatePartnerOrderStatus,
    cancelOrder,
    trackOrder,
    queryOrder,
    getOrdersByUserIdAdmin,
    getOrdersByPartnerId
};