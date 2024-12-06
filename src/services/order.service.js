const { OrderModel, DineOutModel, CartModel } = require("../models");
const CONSTANTS = require("../config/constant");
const mongoose = require("mongoose");
const moment = require("moment");

// Create a new order
const createOrder = async (userId, cartId, paymentMethod, orderNote, deliveryAddress) => {
  // Fetch the cart and populate item, business, and businessType
  const cart = await CartModel.findById(cartId).populate({
    path: 'items.item', // Populate the item details in the cart
    populate: {
      path: 'business', // Populate the business details of each item
      select: 'businessType', // Include only the businessType field in the populated business data
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('Cart not found or empty.');
  }

  const customOrderId = (Math.floor(Date.now() / 1000) % 1000000).toString().padStart(6, '0');
  const orderNumber = customOrderId;

  const items = cart.items.map(cartItem => ({
    item: cartItem.item._id,
    quantity: cartItem.quantity,
    selectedSize: cartItem.selectedSize,
    selectedColor: cartItem.selectedColor,
    checkIn: cartItem.checkIn, // Transfer check-in date
    checkOut: cartItem.checkOut, // Transfer check-out date
    guestCount: cartItem.guestCount, // Transfer guest count
  }));

  const transactionHistory = [
    {
      type: "Order Placed",
      date: new Date(),
      amount: cart.totalPrice,
      status: "Completed",
    },
  ];

  // Extract businessType from the first item's business
  const businessTypeId = cart.items[0]?.item?.business?.businessType;
  if (!businessTypeId) {
    console.error('Business data:', cart.items[0]?.item?.business); // Debug if missing
    throw new Error('Business type not found for the item.');
  }

  const orderData = {
    user: userId,
    partner: cart.items[0].item.partner._id,
    business: cart.items[0].item.business._id,
    businessType: businessTypeId,
    items,
    totalPrice: cart.totalPrice,
    subtotal: cart.subtotal,
    tax: cart.tax,
    deliveryCharge: cart.deliveryCharge,
    commission: cart.commission,
    paymentMethod,
    orderNote,
    orderId: customOrderId,
    orderNumber,
    orderStatus: "pending",
    transactionHistory,
  };

  if (deliveryAddress) {
    orderData.deliveryAddress = deliveryAddress;
  }

  const order = new OrderModel(orderData);
  await order.save();

  // Clear the cart after order creation
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
      resolve({ success: true }); // Simulate successful payment
    }, 2000); // Simulate a 2-second delay for the payment process
  });
};

const updateOrderStatus = async (orderId, orderStatus) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw { statusCode: 404, message: CONSTANTS.ORDER_NOT_FOUND };

  if (order.orderStatus === "delivered" || order.orderStatus === "cancelled") {
    throw {
      statusCode: 400,
      message: CONSTANTS.UPDATE_STATUS_AFTER_DELIVERD_ERROR,
    };
  }

  // Update order status and add to transaction history
  order.orderStatus = orderStatus;
  order.transactionHistory.push({
    type: `Order ${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}`, // Capitalize status
    date: new Date(),
    amount: order.totalPrice,
    status: "Completed",
  });

  await order.save();
  return order;
};

// Get all orders by user
const getOrdersByUser = async (userId, page = 1, limit = 10, sortOrder = "desc") => {
  const sort = { createdAt: sortOrder === "asc" ? 1 : -1 }; // Dynamic sorting based on `asc` or `desc`
  const query = { user: userId }; // Filtering by user

  const options = {
    page,
    limit,
    sort,
    lean: true,
    populate: [
      {
        path: "items.item",
        select: "name itemType",
      },
      {
        path: "business",
        select: "businessName businessAddress",
      },
    ],
  };

  const result = await OrderModel.paginate(query, options);

  // Map business details and format the response
  result.docs = result.docs.map((order) => ({
    ...order,
    businessDetails: order.business
      ? {
        name: order.business.businessName,
        address: [
          order.business.businessAddress.street,
          order.business.businessAddress.city,
          order.business.businessAddress.state,
          order.business.businessAddress.country,
          order.business.businessAddress.postalCode,
        ]
          .filter(Boolean)
          .join(", "),
      }
      : null,
  }));

  return result;
};

// Get order by ID
const getOrderById = async (orderId) => {
  const order = await OrderModel.findById(orderId)
    .populate("user", "_id name email phone") // Populate user details
    .populate("partner", "_id name email phone") // Populate partner details
    .populate({
      path: "items.item",
      populate: [
        {
          path: "business",
          select: "businessName businessAddress",
        },
        {
          path: "variants.variantId",
          select: "name size color price image",
        },
        {
          path: "parentCategory", // Populate parent category for food items
          select: "categoryName tax",
        },
        {
          path: "subCategory", // Populate subcategory for food items
          select: "categoryName tax",
        },
      ],
      select: "itemType roomName roomPrice roomDescription checkIn checkOut guest amenities images dishName dishPrice dishDescription productName productDescription business variant parentCategory subCategory",
    });

  if (!order) throw new Error(CONSTANTS.ORDER_NOT_FOUND);

  // Transform the items array
  const items = order.items.map((item) => {
    if (item.item) {
      const { itemType } = item.item;

      if (itemType === "room") {
        const checkInDate = item.item.checkIn ? new Date(item.item.checkIn) : null;
        const checkOutDate = item.item.checkOut ? new Date(item.item.checkOut) : null;
        const nights = checkInDate && checkOutDate
          ? Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          itemId: item.item._id,
          itemType,
          roomName: item.item.roomName,
          roomDescription: item.item.roomDescription,
          amenities: item.item.amenities || [],
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          partnerCheckIn: item.item.checkIn || null,
          partnerCheckOut: item.item.checkOut || null,
          guestCount: item.guestCount || 0,
          quantity: item.quantity || 0,
          nights,
          roomPrice: item.item.roomPrice,
          price: nights * (item.item.roomPrice || 0),
          images: item.item.images || [],
        };
      }

      if (itemType === "food") {
        return {
          itemId: item.item._id,
          itemType,
          dishName: item.item.dishName,
          dishDescription: item.item.dishDescription || null,
          quantity: item.quantity,
          price: item.item.dishPrice * item.quantity,
          images: item.item.images || [],
          parentCategory: item.item.parentCategory
            ? {
              categoryId: item.item.parentCategory._id,
              categoryName: item.item.parentCategory.categoryName,
              tax: item.item.parentCategory.tax,
            }
            : null,
          subCategory: item.item.subCategory
            ? {
              categoryId: item.item.subCategory._id,
              categoryName: item.item.subCategory.categoryName,
              tax: item.item.subCategory.tax,
            }
            : null,
        };
      }

      // Handle product items
      return {
        itemId: item.item._id,
        itemType,
        productName: item.item.productName,
        productDescription: item.item.productDescription,
        quantity: item.quantity,
        price: item.item.productPrice * item.quantity,
        images: item.item.images || [],
        variants: item.item.variants
          .filter((variant) => variant.variantId)
          .map((variant) => ({
            variantId: variant.variantId?._id,
            name: variant.variantId?.name,
            size: variant.variantId?.size,
            color: variant.variantId?.color,
            price: variant.productPrice,
            image: variant.image || variant.variantId?.image || null,
          })),
      };
    }
    return {
      itemId: null,
      itemType: null,
      productName: null,
      quantity: 0,
      price: 0,
      guestCount: 0,
      selectedSize: null,
      selectedColor: null,
      variants: [],
      images: [],
    };
  });

  const businessDetails = order.items
    .filter((item) => item.item && item.item.business)
    .map((item) => {
      const location = item.item.business.businessAddress.location?.coordinates || [];
      return {
        itemType: item.item.itemType,
        businessName: item.item.business.businessName,
        businessAddress: [
          item.item.business.businessAddress.street,
          item.item.business.businessAddress.city,
          item.item.business.businessAddress.state,
          item.item.business.businessAddress.country,
          item.item.business.businessAddress.postalCode,
        ]
          .filter(Boolean)
          .join(", "),
        coordinates: {
          longitude: location[0] || null,
          latitude: location[1] || null,
        },
      };
    });

  return {
    ...order.toObject(),
    items,
    deliveryCharge: order.deliveryCharge || 0,
    commission: order.commission || 0,
    businessDetails,
    deliveryPartner: {
      name: order.deliveryPartner?.name || null,
      phone: order.deliveryPartner?.phone || null,
    },
  };
};

// Get pending food requests for the partner
const getPendingFoodRequests = async (partnerId, sortOrder = "desc") => {
  const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };
  const orders = await OrderModel.find({
    partner: partnerId,
    orderStatus: "pending",
  })
    .sort(sort)
    .populate({
      path: "items.item",
      select: "itemType dishName dishPrice dishDescription", // Include name and description
      match: { itemType: "food" },
    });

  // Filter to ensure orders contain at least one valid item
  return orders.filter((order) => order.items.some((item) => item.item));
};

const getPendingRoomRequests = async (partnerId, sortOrder = "desc") => {
  const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };
  const orders = await OrderModel.find({
    partner: partnerId,
    orderStatus: "pending",
  })
    .sort(sort)
    .populate({
      path: "items.item",
      select: "itemType roomName roomPrice roomDescription", // Include fields you need from Item model
      match: { itemType: "room" }, // Filter items by room type
    });

  return orders.filter((order) => order.items.some((item) => item.item));
};

const getPendingProductRequests = async (partnerId, sortOrder = "desc") => {
  const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };
  const orders = await OrderModel.find({
    partner: partnerId,
    orderStatus: "pending",
  })
    .sort(sort)
    .populate({
      path: "items.item",
      select: "itemType productName productPrice productDescription",
    });

  return orders.filter((order) =>
    order.items.some((item) => item.item && item.item.itemType === "product")
  );
};

// Get order by status for the partner
const getOrdersByStatus = async (partnerId, itemType, orderStatus) => {
  const orders = await OrderModel.find({
    partner: partnerId,
    ...(orderStatus && { orderStatus }), // Filter by orderStatus if provided
  })
    .sort({ createdAt: -1 }) // Sort by createdAt in descending order (latest first)
    .populate({
      path: "items.item",
      select: "itemType",
      match: { itemType: itemType }, // Match items by itemType
    });

  // Filter out orders that do not match the itemType
  return orders.filter((order) =>
    order.items.some((item) => item.item && item.item.itemType === itemType)
  );
};

// Update the status of an order/request (Accept or Reject)
const updatePartnerRequestStatus = async (
  orderId,
  partnerId,
  partnerResponse
) => {
  const order = await OrderModel.findOne({ _id: orderId, partner: partnerId });

  if (!order) {
    throw new Error("Order not found or unauthorized access");
  }

  if (order.orderStatus !== "pending") {
    throw new Error("Order is no longer in a pending state");
  }

  // Update order status and partner response
  order.orderStatus = partnerResponse === "accepted" ? "accepted" : "rejected";
  order.partnerResponse = partnerResponse;

  // Log the response in transaction history
  order.transactionHistory.push({
    type: `Request ${partnerResponse.charAt(0).toUpperCase() + partnerResponse.slice(1)
      }`,
    date: new Date(),
    amount: order.totalPrice,
    status: partnerResponse === "accepted" ? "Completed" : "Rejected",
  });

  await order.save();
  return order;
};

// Update delivery partner
const updateDeliveryPartner = async (orderId, deliveryPartner) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.deliveryPartner = deliveryPartner;
  order.orderStatus = "out_for_delivery"; // Change status to 'Out for Delivery'
  await order.save();

  return order;
};

// Cancel an order
const cancelOrder = async (orderId, reason) => {
  const order = await OrderModel.findById(orderId).populate({
    path: "items.item",
    select: "itemType roomName roomDescription amenities images roomPrice",
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const today = new Date();

  // Ensure the order can be cancelled
  if (order.orderStatus !== "pending") {
    throw new Error("Only pending orders can be cancelled.");
  }

  // Update order status and cancellation reason
  order.orderStatus = "cancelled";
  order.cancellationReason = reason;
  order.cancellationDate = today; // Add cancellation date

  await order.save();

  // Prepare enriched items data
  const items = order.items.map((item) => {
    if (item.item) {
      return {
        itemId: item.item._id,
        itemType: item.item.itemType,
        roomName: item.item.roomName,
        roomDescription: item.item.roomDescription,
        amenities: item.item.amenities || [],
        checkIn: item.checkIn, // Check-in from the order's item
        checkOut: item.checkOut, // Check-out from the order's item
        guests: item.guests || item.quantity, // Guests from the order's item
        nights: Math.ceil(
          (new Date(item.checkOut) - new Date(item.checkIn)) /
          (1000 * 60 * 60 * 24)
        ),
        roomPrice: item.item.roomPrice,
        price: Math.ceil(
          (new Date(item.checkOut) - new Date(item.checkIn)) /
          (1000 * 60 * 60 * 24) * item.item.roomPrice
        ),
        images: item.item.images || [],
      };
    }
    return {};
  });

  return {
    _id: order._id,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    cancellationReason: reason,
    cancellationDate: today,
    items,
  };
};

// Update Complete Booking
const updateCompletedBookings = async () => {
  try {
    const currentDate = new Date();

    // Find all orders with checkOut date passed and not already completed
    const updatedOrders = await OrderModel.updateMany(
      {
        "items.checkOut": { $lte: currentDate }, // Check-out date has passed
        orderStatus: { $in: ["pending", "accepted"] }, // Only pending or accepted
      },
      {
        $set: { orderStatus: "completed" }, // Update status to completed
        $currentDate: { updatedAt: true }, // Update the updatedAt field
      }
    );

    console.log(`Updated ${updatedOrders.modifiedCount} bookings to 'completed' status.`);
  } catch (error) {
    console.error("Error updating completed bookings:", error);
  }
};

// Get list of completed bookings
const getCompletedBookings = async (userId) => {
  const completedBookings = await OrderModel.find({
    user: userId, // Fetch bookings for the current user
    orderStatus: "completed", // Only completed bookings
  })
    .populate({
      path: "items.item",
      select: "itemType roomName roomDescription roomPrice images amenities",
    })
    .populate("business", "businessName businessAddress")
    .populate("user", "name email phone");

  // Filter and map completed bookings to include user-specific checkIn and checkOut
  return completedBookings.map((order) => ({
    ...order.toObject(),
    items: order.items.map((item) => {
      const checkInDate = new Date(item.checkIn);
      const checkOutDate = new Date(item.checkOut);

      // Calculate total nights
      const totalNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

      return {
        itemId: item.item._id,
        itemType: item.item.itemType,
        roomName: item.item.roomName,
        roomDescription: item.item.roomDescription,
        amenities: item.item.amenities || [],
        images: item.item.images || [],
        roomPrice: item.item.roomPrice,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        quantity: item.quantity, // Room quantity
        totalNights,
        guests: item.guestCount || item.quantity, // Use guestCount or fallback to quantity
        totalPrice: totalNights * item.item.roomPrice * item.quantity, // Calculate total price
      };
    }),
  }));
};

// Rebook hotel room
const rebookRoomOrder = async (userId, orderId, itemId, newCheckIn, newCheckOut, newGuestCount) => {
  // Fetch the original order
  const originalOrder = await OrderModel.findById(orderId).populate("items.item");
  if (!originalOrder) {
    throw new Error("Order not found.");
  }

  // Ensure the order belongs to the user
  if (originalOrder.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized access to order.");
  }

  // Find the specific room item
  const roomItem = originalOrder.items.find(
    (item) => item.item._id.toString() === itemId && item.item.itemType === "room"
  );
  if (!roomItem) {
    throw new Error("Rebooking allowed only for valid room items.");
  }

  // Validate new check-in and check-out dates
  if (!newCheckIn || !newCheckOut) {
    throw new Error("New check-in and check-out dates are required.");
  }
  const checkInDate = new Date(newCheckIn);
  const checkOutDate = new Date(newCheckOut);
  if (checkInDate >= checkOutDate) {
    throw new Error("Invalid check-in and check-out date order.");
  }

  // Calculate new nights and total price
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const newTotalPrice = nights * roomItem.item.roomPrice;

  // Set a default delivery charge or reuse from the original order
  const deliveryCharge = originalOrder.deliveryCharge || 0;

  // Create the rebooking order
  const customOrderId = (Math.floor(Date.now() / 1000) % 1000000).toString().padStart(6, '0');
  const newOrderData = {
    user: userId,
    partner: originalOrder.partner,
    business: originalOrder.business,
    items: [
      {
        item: roomItem.item._id,
        quantity: 1,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        guestCount: newGuestCount || roomItem.guestCount,
      },
    ],
    totalPrice: newTotalPrice + deliveryCharge,
    subtotal: newTotalPrice,
    tax: originalOrder.tax, // Reuse tax from the original order
    commission: originalOrder.commission, // Reuse commission
    deliveryCharge, // Include delivery charge
    paymentMethod: originalOrder.paymentMethod,
    orderStatus: "pending", // Start with 'pending' status for rebooked orders
    orderId: customOrderId,
    orderNumber: { customOrderId },
    transactionHistory: [
      {
        type: "Rebooking Created",
        date: new Date(),
        amount: newTotalPrice,
        status: "Pending",
      },
    ],
  };

  const newOrder = await OrderModel.create(newOrderData);

  return {
    _id: newOrder._id,
    orderId: newOrder.orderId,
    orderNumber: newOrder.orderNumber,
    checkIn: newOrder.items[0].checkIn,
    checkOut: newOrder.items[0].checkOut,
    guestCount: newOrder.items[0].guestCount,
    totalPrice: newOrder.totalPrice,
    orderStatus: newOrder.orderStatus,
  };
};

// Reorder Function for Food and Product
const reorderItems = async (userId, orderId, itemIds, quantities, newDeliveryAddress) => {
  // Fetch the original order
  const originalOrder = await OrderModel.findById(orderId).populate("items.item");
  if (!originalOrder) {
    throw new Error("Order not found.");
  }

  // Ensure the order belongs to the user
  if (originalOrder.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized access to order.");
  }

  // Filter the items to be reordered
  const itemsToReorder = originalOrder.items.filter(item =>
    itemIds.includes(item.item._id.toString()) &&
    (item.item.itemType === 'food' || item.item.itemType === 'product')
  );

  if (itemsToReorder.length === 0) {
    throw new Error("No valid items found for reorder.");
  }

  // Map items for the new order
  const reorderedItems = itemsToReorder.map(item => {
    const quantity = quantities[item.item._id.toString()] || item.quantity; // Use new or original quantity
    return {
      item: item.item._id,
      quantity,
      selectedSize: item.selectedSize || null,
      selectedColor: item.selectedColor || null,
    };
  });

  // Calculate the total price for the reordered items
  const totalPrice = reorderedItems.reduce((total, item) => {
    const itemDetails = itemsToReorder.find(i => i.item._id.toString() === item.item.toString());
    const price =
      (itemDetails.item.variants?.find(
        v => v.size === item.selectedSize && v.color === item.selectedColor
      )?.productPrice || itemDetails.item.dishPrice || 0) * item.quantity;
    return total + price;
  }, 0);

  // Include delivery charge if applicable
  const deliveryCharge = originalOrder.deliveryCharge || 0;

  // Create a new order for the reordered items
  const customOrderId = (Math.floor(Date.now() / 1000) % 1000000).toString().padStart(6, '0');
  const reorderedOrder = await OrderModel.create({
    user: userId,
    partner: originalOrder.partner,
    business: originalOrder.business,
    items: reorderedItems,
    totalPrice: totalPrice + deliveryCharge,
    subtotal: totalPrice,
    tax: originalOrder.tax, // Reuse tax from the original order
    commission: originalOrder.commission, // Reuse commission
    deliveryCharge, // Include delivery charge
    deliveryAddress: newDeliveryAddress || originalOrder.deliveryAddress, // Use new or original address
    paymentMethod: originalOrder.paymentMethod,
    orderStatus: "pending", // Start with 'pending' status for reordered items
    orderId: customOrderId,
    orderNumber: customOrderId,
    transactionHistory: [
      {
        type: "Reorder Created",
        date: new Date(),
        amount: totalPrice,
        status: "Pending",
      },
    ],
  });

  return {
    _id: reorderedOrder._id,
    orderId: reorderedOrder.orderId,
    orderNumber: reorderedOrder.orderNumber,
    totalPrice: reorderedOrder.totalPrice,
    deliveryAddress: reorderedOrder.deliveryAddress,
    orderStatus: reorderedOrder.orderStatus,
  };
};

// Track order status
const trackOrder = async (orderId) => {
  const order = await OrderModel.findById(orderId)
    .populate({
      path: "items.item",
      select: "itemType dishName productName productDescription images",
    })
    .populate("user", "name email")
    .populate("partner", "name")
    .populate({
      path: "business",
      select: "businessName businessAddress",
    });

  if (!order) {
    return null;
  }

  order.items = order.items.map((item) => {
    const itemData = item.item;
    let itemName = "";
    if (itemData.itemType === "food") {
      itemName = itemData.dishName;
    } else if (itemData.itemType === "product") {
      itemName = itemData.productName;
    }

    return {
      ...item.toObject(),
      item: {
        ...itemData.toObject(),
        itemName,
      },
    };
  });

  // Format business details
  const businessDetails = order.business
    ? {
      name: order.business.businessName,
      address: [
        order.business.businessAddress.street,
        order.business.businessAddress.city,
        order.business.businessAddress.state,
        order.business.businessAddress.country,
        order.business.businessAddress.postalCode,
      ]
        .filter(Boolean) // Remove any empty values
        .join(", "),
    }
    : null;

  const populatedOrder = {
    ...order.toObject(),
    businessDetails,
  };

  delete populatedOrder.business; // Remove original business field
  return populatedOrder;
};

// Get Orders Of All Users
const queryOrder = async (options) => {
  var matchCondition = {};
  // Filter by userId
  if (options.userId && options.userId !== "undefined") {
    matchCondition.user = new mongoose.Types.ObjectId(String(options.userId));
  }
  // Filter by partnerId
  if (options.partnerId && options.partnerId !== "undefined") {
    matchCondition.partner = new mongoose.Types.ObjectId(
      String(options.partnerId)
    );
  }

  // Filter by search query (orderId, user name, or email)
  if (options.search && options.search !== "undefined") {
    matchCondition.$or = [
      { orderId: { $regex: ".*" + options.search + ".*", $options: "i" } },
      {
        "userDetails.name": {
          $regex: ".*" + options.search + ".*",
          $options: "i",
        },
      },
      {
        "userDetails.email": {
          $regex: ".*" + options.search + ".*",
          $options: "i",
        },
      },
    ];
  }
  // Filter by status
  if (options.status && options.status !== "undefined") {
    matchCondition.status = options.status;
  }
  // Aggregation pipeline
  const aggregateQuery = [
    {
      $lookup: {
        from: "users", // Join with the users collection for user details
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $lookup: {
        from: "users", // Join with the users collection for partner details
        localField: "partner",
        foreignField: "_id",
        as: "partnerDetails",
      },
    },
    { $unwind: { path: "$partnerDetails", preserveNullAndEmptyArrays: true } }, // Unwind partnerDetails
    { $match: matchCondition }, // Apply match condition here
    {
      $lookup: {
        from: "items", // Join with the items collection for item details
        localField: "items.item",
        foreignField: "_id",
        as: "itemDetails",
      },
    },
  ];
  // If filtering by itemType, add a match for itemType inside items
  if (options.itemType && options.itemType !== "undefined") {
    aggregateQuery.push({
      $match: {
        "itemDetails.itemType": options.itemType,
      },
    });
  }
  // Apply sorting
  const sortOption = {};
  if (options.sortBy && options.sortBy !== "undefined") {
    sortOption[options.sortBy] = options.sortOrder === "asc" ? 1 : -1;
  } else {
    sortOption["createdAt"] = -1;
  }
  aggregateQuery.push({ $sort: sortOption });

  const aggregateQueryPipeline = OrderModel.aggregate(aggregateQuery);
  const data = await OrderModel.aggregatePaginate(aggregateQueryPipeline, {
    page: options.page || 1,
    limit: options.limit || 10,
  });
  return data;
};

// Get Orders Of Users By userId
const getOrdersByUserIdAdmin = async (
  userId = null,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 10
) => {
  const query = userId ? { user: userId } : {};
  if (search) {
    query.$or = [
      { "user.name": { $regex: search, $options: "i" } },
      { "user.email": { $regex: search, $options: "i" } },
    ];
  }
  const skip = (page - 1) * limit;
  const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
  const orders = await OrderModel.find(query)
    .populate("user", "name email")
    .populate("items.item")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);
  const totalOrders = await OrderModel.countDocuments(query);
  return { orders, totalOrders };
};

// Get Orders Of Partner By partnerId
const getOrdersByPartnerId = async (
  partnerId,
  search = "",
  itemType = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  page = 1,
  limit = 10
) => {
  const query = { partner: partnerId };

  if (search) {
    query.$or = [
      { "user.name": { $regex: search, $options: "i" } },
      { "user.email": { $regex: search, $options: "i" } },
      { orderId: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const orders = await OrderModel.find(query)
    .populate({
      path: "items.item",
      match: itemType ? { itemType: itemType } : {},
      populate: [
        { path: "partner", select: "name email" },
        { path: "business", select: "businessName status" },
        { path: "businessType", select: "name" },
      ],
    })
    .populate("user", "name email")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  const filteredOrders = orders.filter((order) =>
    order.items.some((item) => item.item)
  );
  const totalOrders = filteredOrders.length;

  return { orders: filteredOrders, totalOrders };
};

const getHistoryByCategory = async (userId, category, status, page = 1, limit = 10, sortOrder = "desc") => {
  const validCategories = ["restaurants", "hotels", "products", "dineout"];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category specified. Valid categories are: ${validCategories.join(", ")}`);
  }

  const matchCondition = { user: userId };
  if (status) matchCondition.orderStatus = status;

  const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };

  let aggregatePipeline = [];

  const lookupAndProject = [
    {
      $lookup: {
        from: "items",
        localField: "items.item",
        foreignField: "_id",
        as: "itemDetails",
      },
    },
    { $unwind: "$itemDetails" },
    {
      $lookup: {
        from: "businesses",
        localField: "itemDetails.business",
        foreignField: "_id",
        as: "businessDetails",
      },
    },
    { $unwind: "$businessDetails" },
    {
      $lookup: {
        from: "users",
        let: { partnerId: "$itemDetails.partner" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$partnerId"] } } }
        ],
        as: "partnerDetails",
      },
    },
    { $unwind: { path: "$partnerDetails", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        createdAt: 1,
        orderStatus: 1,
        totalPrice: 1,
        subtotal: 1,
        tax: 1,
        deliveryCharge: 1,
        commission: 1,
        items: 1,
        "itemDetails.itemType": 1,
        "itemDetails.dishName": 1,
        "itemDetails.roomName": 1,
        "itemDetails.productName": 1,
        "itemDetails.images": 1,
        "itemDetails.checkIn": 1,
        "itemDetails.checkOut": 1,
        "businessDetails.businessName": 1,
        "businessDetails.businessAddress": 1,
        "businessDetails.images": 1,
        "partnerDetails._id": 1,
        "partnerDetails.name": 1,
        "partnerDetails.email": 1
      },
    }
  ];

  if (category === "restaurants") {
    aggregatePipeline = [
      { $match: matchCondition },
      ...lookupAndProject,
      { $match: { "itemDetails.itemType": "food" } },
      { $sort: sort },
      {
        $facet: {
          metadata: [{ $count: "totalDocs" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];
  } else if (category === "hotels") {
    aggregatePipeline = [
      { $match: matchCondition },
      ...lookupAndProject,
      { $match: { "itemDetails.itemType": "room" } },
      { $sort: sort },
      {
        $facet: {
          metadata: [{ $count: "totalDocs" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];
  } else if (category === "products") {
    aggregatePipeline = [
      { $match: matchCondition },
      ...lookupAndProject,
      { $match: { "itemDetails.itemType": "product" } },
      { $sort: sort },
      {
        $facet: {
          metadata: [{ $count: "totalDocs" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];
  } else if (category === "dineout") {
    aggregatePipeline = [
      { $match: { user: userId } },
      {
        $lookup: {
          from: "businesses",
          localField: "business",
          foreignField: "_id",
          as: "businessDetails",
        },
      },
      { $unwind: "$businessDetails" },
      {
        $project: {
          createdAt: 1,
          status: 1,
          date: 1,
          time: 1,
          guests: 1,
          dinnerType: 1,
          "businessDetails.businessName": 1,
          "businessDetails.businessAddress": 1,
          "businessDetails.images": 1, // Retrieve business images
        },
      },
      { $sort: sort },
      {
        $facet: {
          metadata: [{ $count: "totalDocs" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];
  }
  const results = await (category === "dineout"
    ? DineOutModel.aggregate(aggregatePipeline)
    : OrderModel.aggregate(aggregatePipeline));

  const totalDocs = results[0]?.metadata[0]?.totalDocs || 0;
  const totalPages = Math.ceil(totalDocs / limit);

  const data = results[0]?.data || [];
  return {
    totalDocs,
    totalPages,
    page,
    limit,
    data,
  };
};

const getAllHistory = async (userId, sortOrder = "desc") => {
  const sort = { createdAt: sortOrder === "asc" ? 1 : -1 };

  try {
    // Fetch orders and dine-out reservations
    const [orders, dineOutReservations] = await Promise.all([
      OrderModel.find({ user: userId })
        .populate({
          path: "items.item",
          select: "itemType dishName productName roomName images checkIn checkOut",
        })
        .populate({
          path: "business",
          select: "businessName businessAddress",
        })
        .sort(sort)
        .lean(), // Ensures plain JavaScript objects

      DineOutModel.find({ user: userId })
        .populate({
          path: "business",
          select: "businessName businessAddress bannerImages",
        })
        .sort(sort)
        .lean(), // Ensures plain JavaScript objects
    ]);

    // Map the response
    return {
      foodOrders: orders
        .filter((order) => order.items.some((item) => item.item?.itemType === "food"))
        .map((order) => ({
          ...order,
          businessName: order.business?.businessName || null,
          businessAddress: order.business?.businessAddress?.street || null,
          items: order.items.map((item) => ({
            ...item,
            image: item.item?.images?.[0] || null, // First image
            name: item.item?.dishName || null, // Dish name for food
          })),
        })),
      roomBookings: orders
        .filter((order) => order.items.some((item) => item.item?.itemType === "room"))
        .map((order) => ({
          ...order,
          businessName: order.business?.businessName || null,
          businessAddress: order.business?.businessAddress?.street || null,
          items: order.items.map((item) => ({
            ...item,
            image: item.item?.images?.[0] || null,
            name: item.item?.roomName || null,
            userCheckIn: item.checkIn || null,
            userCheckOut: item.checkOut || null,
            partnerCheckIn: item.item?.checkIn || null,
            partnerCheckOut: item.item?.checkOut || null,
          })),
        })),
      productOrders: orders
        .filter((order) => order.items.some((item) => item.item?.itemType === "product"))
        .map((order) => ({
          ...order,
          businessName: order.business?.businessName || null,
          businessAddress: order.business?.businessAddress?.street || null,
          items: order.items.map((item) => ({
            ...item,
            image: item.item?.images?.[0] || null,
            name: item.item?.productName || null, // Product name
          })),
        })),
      dineOutReservations: dineOutReservations.map((reservation) => ({
        ...reservation,
        businessName: reservation.business?.businessName || null,
        businessAddress: reservation.business?.businessAddress?.street || null,
        image: reservation.business?.bannerImages?.[0] || null, // First banner image
      })),
    };
  } catch (error) {
    console.error("Error fetching order history:", error);
    throw new Error("Failed to fetch order history.");
  }
};

const getTransactionHistoryByOrderId = async (orderId) => {
  const order = await OrderModel.findById(orderId)
    .populate("user", "name email phone")
    .populate("partner", "name email")
    .populate({
      path: "items.item",
      populate: {
        path: "business businessType",
        select: "businessName name",
      },
    })
    .select(
      "transactionHistory refundDetails totalPrice subtotal tax deliveryCharge orderStatus paymentMethod deliveryAddress orderNote createdAt updatedAt items orderId"
    );

  if (!order) {
    throw new Error(CONSTANTS.ORDER_NOT_FOUND);
  }

  // Map transaction history and add transactionId
  const filteredTransactionHistory = order.transactionHistory.map(
    (transaction) => ({
      transactionId: transaction._id, // Assuming _id is available as a unique identifier for each transaction
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      status: transaction.status,
    })
  );

  // Extract refund details as a separate field
  const refundDetails =
    order.refundDetails && order.refundDetails.status !== "none"
      ? {
        reason: order.refundDetails.reason,
        status: order.refundDetails.status,
        requestedDate: order.refundDetails.requestedDate,
        approvedDate: order.refundDetails.approvedDate,
        amount: order.refundDetails.amount,
        bankDetails: order.refundDetails.bankDetails,
      }
      : null;

  return {
    orderId: order.orderId, // Ensure orderId is included
    orderNumber: order.orderNumber,
    user: order.user,
    partner: order.partner,
    items: order.items.map((item) => ({
      itemId: item.item._id,
      itemType: item.item.itemType,
      name: item.item.productName || item.item.dishName || item.item.roomName,
      description:
        item.item.productDescription ||
        item.item.dishDescription ||
        item.item.roomDescription,
      quantity: item.quantity,
      selectedSize: item.selectedSize || null,
      selectedColor: item.selectedColor || null,
    })),
    totalPrice: order.totalPrice,
    subtotal: order.subtotal,
    tax: order.tax,
    deliveryCharge: order.deliveryCharge,
    orderStatus: order.orderStatus,
    paymentMethod: order.paymentMethod,
    deliveryAddress: order.deliveryAddress,
    orderNote: order.orderNote,
    transactionHistory: filteredTransactionHistory, // Updated transaction history with transactionId
    refundDetails, // Separate refund details
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

const getAllTransactionHistory = async ({
  page = 1,
  limit = 10,
  itemType,
  status,
  search,
  sortBy,
  sortOrder,
  startDate,
  endDate,
}) => {
  // Parse page and limit to integers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const query = {};

  // Apply order status filter if provided
  if (status) {
    query["orderStatus"] = status;
  }

  // Apply date range filter if provided
  if (startDate || endDate) {
    query["createdAt"] = {};
    if (startDate) query["createdAt"]["$gte"] = new Date(startDate);
    if (endDate) query["createdAt"]["$lte"] = new Date(endDate);
  }

  // Aggregation pipeline
  const aggregateQuery = [
    { $match: query },

    // $lookup to populate user details
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" }, // Unwind to access user fields directly

    // $lookup to populate partner details
    {
      $lookup: {
        from: "users",
        localField: "partner",
        foreignField: "_id",
        as: "partnerDetails",
      },
    },
    { $unwind: "$partnerDetails" }, // Unwind to access partner fields directly

    // $lookup with itemType filtering in the pipeline
    {
      $lookup: {
        from: "items",
        let: { itemIds: "$items.item" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$itemIds"] } } },
          ...(itemType ? [{ $match: { itemType: itemType } }] : []),
        ],
        as: "filteredItems",
      },
    },

    // Ensure orders have at least one item of the specified type
    { $match: { filteredItems: { $ne: [] } } },

    // Add a search stage if search is provided
    ...(search
      ? [
        {
          $match: {
            $or: [
              { "userDetails.name": { $regex: search, $options: "i" } },
              { "userDetails.email": { $regex: search, $options: "i" } },
              { "userDetails.phone": { $regex: search, $options: "i" } },
              { "partnerDetails.name": { $regex: search, $options: "i" } },
              { "partnerDetails.email": { $regex: search, $options: "i" } },
              { "partnerDetails.phone": { $regex: search, $options: "i" } },
              { orderId: { $regex: search, $options: "i" } },
            ],
          },
        },
      ]
      : []),

    // Sort and paginate results
    { $sort: { createdAt: -1 } },
    { $skip: (pageNumber - 1) * limitNumber },
    { $limit: limitNumber },

    // Project only relevant fields
    {
      $project: {
        transactionId: "$_id",
        createdAt: 1,
        userName: "$userDetails.name",
        userEmail: "$userDetails.email",
        userPhone: "$userDetails.phone",
        orderId: 1,
        amount: "$totalPrice",
        status: "$orderStatus",
      },
    },
  ];

  // Execute the aggregation
  const orderSummaries = await OrderModel.aggregate(aggregateQuery);

  return {
    data: orderSummaries,
    totalOrders: orderSummaries.length,
    currentPage: pageNumber,
    totalPages: Math.ceil(orderSummaries.length / limitNumber),
  };
};

// Get Partner Refund Details
const getPartnerRefunds = async (
  partnerId,
  {
    page = 1,
    limit = 10,
    status,
    search,
    sortBy = "refundDetails.requestedDate", // Default to sorting by refund request date
    sortOrder = "desc",
  }
) => {
  const matchCondition = {
    partner: partnerId,
    "refundDetails.status": { $ne: "none" }, // Fetch refunds with a defined status
  };

  // Apply status filter if provided
  if (status) matchCondition["refundDetails.status"] = status;

  // Apply search filter for user name or orderId
  if (search) {
    matchCondition["$or"] = [
      { "userDetails.name": { $regex: search, $options: "i" } },
      { orderId: { $regex: search, $options: "i" } },
    ];
  }

  // Define sorting explicitly for latest refunds on top
  const sortOption = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  // Convert page and limit to numbers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  // Build aggregation pipeline
  const aggregateQuery = [
    { $match: matchCondition },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        refundId: "$refundDetails._id",
        transactionId: "$transactionHistory._id",
        createdAt: "$refundDetails.requestedDate", // Request date for refund
        refundDate: "$refundDetails.processedDate", // Refund date (added here)
        userName: "$userDetails.name",
        orderId: "$orderId",
        status: "$refundDetails.status",
        amount: "$refundDetails.amount",
      },
    },
    { $sort: sortOption }, // Explicit sorting for latest refunds
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
  ];

  // Execute the aggregation pipeline with pagination
  const refundListings = await OrderModel.aggregate(aggregateQuery);
  const totalDocs = await OrderModel.countDocuments(matchCondition);

  return {
    docs: refundListings,
    page: pageNum,
    limit: limitNum,
    totalDocs,
    totalPages: Math.ceil(totalDocs / limitNum),
    pagingCounter: (pageNum - 1) * limitNum + 1,
    hasPrevPage: pageNum > 1,
    hasNextPage: pageNum < Math.ceil(totalDocs / limitNum),
    prevPage: pageNum > 1 ? pageNum - 1 : null,
    nextPage: pageNum < Math.ceil(totalDocs / limitNum) ? pageNum + 1 : null,
  };
};

// Get Admin Refund Details
const getRefundDetails = async ({
  page = 1,
  limit = 10,
  status,
  search,
  fromDate,
  toDate,
}) => {
  // Convert page and limit to integers
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  const matchCondition = { "refundDetails.status": { $ne: "none" } };

  if (status) matchCondition["refundDetails.status"] = status;
  if (search) {
    matchCondition.$or = [
      { "userDetails.name": { $regex: search, $options: "i" } },
      { orderId: { $regex: search, $options: "i" } },
    ];
  }
  if (fromDate || toDate) {
    matchCondition["refundDetails.requestedDate"] = {};
    if (fromDate)
      matchCondition["refundDetails.requestedDate"].$gte = new Date(fromDate);
    if (toDate)
      matchCondition["refundDetails.requestedDate"].$lte = new Date(toDate);
  }

  const aggregateQuery = [
    { $match: matchCondition },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $addFields: {
        lastTransaction: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$transactionHistory",
                cond: {
                  $or: [
                    { $eq: ["$$this.type", "Refund Approved"] },
                    { $eq: ["$$this.type", "Refund Requested"] },
                  ],
                },
              },
            },
            -1,
          ],
        },
      },
    },
    {
      $project: {
        refundId: "$refundDetails._id", // Getting refundId
        transactionId: "$lastTransaction._id",
        createdAt: "$refundDetails.requestedDate",
        userName: "$userDetails.name",
        orderId: "$orderId",
        status: "$refundDetails.status", // Access the latest refund status
        amount: "$refundDetails.amount", // Getting refund amount
      },
    },
    // Explicitly sort by createdAt descending to ensure latest refunds are on top
    { $sort: { createdAt: -1 } },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
  ];

  const refundDetails = await OrderModel.aggregate(aggregateQuery);

  return {
    docs: refundDetails,
    page: pageNum,
    limit: limitNum,
    totalDocs: refundDetails.length,
  };
};

const requestRefundOrExchange = async (
  orderId,
  itemIds,
  reason,
  action,
  bankDetails
) => {
  const order = await OrderModel.findById(orderId).populate("items.item");
  if (!order) throw new Error(CONSTANTS.ORDER_NOT_FOUND);

  // Ensure action is either 'refund' or 'exchange'
  if (action !== "refund" && action !== "exchange") {
    throw new Error("Invalid action. Must be 'refund' or 'exchange'.");
  }

  // Prevent duplicate requests for the same action
  if (action === "refund") {
    // Only throw an error if there is an existing refund request that is pending or approved
    if (
      order.refundDetails &&
      (order.refundDetails.status === "pending_partner" ||
        order.refundDetails.status === "approved")
    ) {
      throw new Error(
        "A refund request is already pending or has been approved for this order."
      );
    }
  } else if (action === "exchange") {
    const existingExchange = order.exchangeDetails.some(
      (detail) => detail.status === "pending" || detail.status === "approved"
    );
    if (existingExchange) {
      throw new Error(
        "An exchange request is already pending or has been approved for this order."
      );
    }
  }

  // Check for refund eligibility only on product items
  if (action === "refund") {
    const invalidItems = order.items.filter(
      (item) =>
        itemIds.includes(item.item._id.toString()) &&
        item.item.itemType !== "product"
    );
    if (invalidItems.length > 0) {
      throw new Error("Refund is only applicable for product items.");
    }
  }

  // Prevent exchange for items that were refunded
  if (action === "exchange") {
    const refundedItems = itemIds.filter(
      (itemId) =>
        itemId in order.refundDetails &&
        order.refundDetails.status === "approved"
    );
    if (refundedItems.length > 0) {
      throw new Error(
        "Exchange is not allowed for items that have already been refunded."
      );
    }
  }

  // Calculate amount based on action (refund/exchange)
  const exactAmount = order.items
    .filter(
      (item) =>
        itemIds.includes(item.item._id.toString()) &&
        item.item.itemType === "product"
    )
    .reduce((total, item) => {
      const variant = item.item.variants?.find(
        (v) => v.size === item.selectedSize && v.color === item.selectedColor
      );
      const price =
        variant?.productPrice || item.item.dishPrice || item.item.roomPrice;
      if (!price)
        throw new Error("Price not found for item during calculation.");
      return total + price * item.quantity;
    }, 0);

  if (isNaN(exactAmount) || exactAmount <= 0)
    throw new Error("Invalid amount calculated.");

  // Handle the refund and exchange actions separately
  if (action === "refund") {
    order.refundDetails = {
      reason,
      status: "pending_partner", // Set to pending_partner for partner action
      requestedDate: new Date(),
      amount: exactAmount,
      bankDetails,
    };
  } else {
    order.exchangeDetails.push({
      reason,
      status: "pending",
      requestedDate: new Date(),
      newProductId: itemIds[0],
    });
  }

  order.transactionHistory.push({
    type: `${action.charAt(0).toUpperCase() + action.slice(1)} Requested`,
    date: new Date(),
    amount: exactAmount,
    status: "pending_partner", // Updated to pending_partner for tracking
  });

  await order.save();
  return order;
};

// Process refund requests by partner
const processRefundOrExchangeDecision = async (
  orderId,
  decision,
  action,
  partnerId
) => {
  const order = await OrderModel.findOne({ _id: orderId, partner: partnerId });
  if (!order) throw new Error("Order not found or unauthorized access");

  const pendingTransaction = order.transactionHistory
    .filter(
      (th) =>
        th.type ===
        `${action.charAt(0).toUpperCase() + action.slice(1)} Requested`
    )
    .pop();

  if (!pendingTransaction || pendingTransaction.status !== "pending_partner") {
    // Check for pending_partner status
    throw new Error(
      `${action.charAt(0).toUpperCase() + action.slice(1)
      } request is either not pending or already processed.`
    );
  }

  const isAccepted = decision === "accept";
  if (action === "refund") {
    order.refundDetails.status = isAccepted ? "approved" : "rejected";
  } else {
    const exchangeDetail = order.exchangeDetails.find(
      (detail) => detail.status === "pending"
    );
    if (exchangeDetail)
      exchangeDetail.status = isAccepted ? "approved" : "rejected";
  }

  order.transactionHistory.push({
    type: `${action.charAt(0).toUpperCase() + action.slice(1)} ${isAccepted ? "Approved" : "Rejected"
      }`,
    date: new Date(),
    amount: pendingTransaction.amount,
    status: isAccepted ? "Completed" : "Rejected",
  });

  await order.save();
  return order;
};

// Get refund details for partner
const getApprovedRefundsByPartner = async (
  partnerId,
  { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" }
) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  const matchCondition = {
    partner: new mongoose.Types.ObjectId(partnerId),
    "refundDetails.status": "approved", // Fetch only approved refunds
  };

  const sortOption = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const aggregatePipeline = [
    { $match: matchCondition },
    {
      $lookup: {
        from: "users", // Lookup user details
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        refundId: "$refundDetails._id", // Refund ID
        transactionId: "$transactionHistory._id",
        createdAt: "$refundDetails.requestedDate",
        refundDate: "$refundDetails.approvedDate",
        userName: "$userDetails.name",
        orderId: "$orderId",
        amount: "$refundDetails.amount",
        status: "$refundDetails.status",
      },
    },
    { $sort: sortOption }, // Sort results
    { $skip: (parsedPage - 1) * parsedLimit },
    { $limit: parsedLimit },
  ];

  const refunds = await OrderModel.aggregate(aggregatePipeline);

  // Total count for pagination
  const totalDocs = await OrderModel.countDocuments(matchCondition);

  return {
    docs: refunds,
    page: parsedPage,
    limit: parsedLimit,
    totalDocs,
    totalPages: Math.ceil(totalDocs / parsedLimit),
    hasPrevPage: parsedPage > 1,
    hasNextPage: parsedPage < Math.ceil(totalDocs / parsedLimit),
    prevPage: parsedPage > 1 ? parsedPage - 1 : null,
    nextPage: parsedPage < Math.ceil(totalDocs / parsedLimit) ? parsedPage + 1 : null,
  };
};

// Process refund requests by admin
const updateExpiredRefundsToAdmin = async () => {
  try {
    const sevenDaysAgo = moment().subtract(7, "days").toDate();

    const result = await OrderModel.updateMany(
      {
        "refundDetails.status": "pending_partner",
        "refundDetails.requestedDate": { $lte: sevenDaysAgo },
      },
      { $set: { "refundDetails.status": "pending_admin" } }
    );

    console.log("Expired refunds updated:", result.modifiedCount);
  } catch (error) {
    console.error("Error updating expired refunds:", error);
  }
};

// Get User and Partner Transactions
const getStartOfWeek = (currentDate) => {
  const dayOfWeek = currentDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const distanceToMonday = (dayOfWeek + 6) % 7; // Calculate distance to Monday
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - distanceToMonday);
  startOfWeek.setHours(0, 0, 0, 0); // Reset to start of the day
  return startOfWeek;
};

const getTransactionHistoryForUserAndPartner = async ({ type, id, filter, page = 1, limit = 10 }) => {
  const matchCondition = {};

  if (type === 'user') {
    matchCondition.user = new mongoose.Types.ObjectId(id);
  } else if (type === 'partner') {
    matchCondition.partner = new mongoose.Types.ObjectId(id);
  } else {
    throw new Error('Invalid type. Must be either "user" or "partner".');
  }

  const currentDate = new Date();
  let startDate;

  // Set the date filter based on the filter parameter
  if (filter === 'month') {
    startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  } else if (filter === 'week') {
    startDate = getStartOfWeek(currentDate); // Monday-to-Sunday approach
  } else if (filter === 'year') {
    startDate = new Date(currentDate.getFullYear(), 0, 1);
  }

  // Add date filtering if startDate is defined
  if (startDate) {
    matchCondition['transactionHistory.date'] = { $gte: startDate, $lte: currentDate };
  }

  // Aggregate transaction history
  const aggregationPipeline = [
    { $match: matchCondition },
    { $unwind: '$transactionHistory' },
    {
      $match: startDate
        ? { 'transactionHistory.date': { $gte: startDate, $lte: currentDate } }
        : {},
    },
    {
      $project: {
        transactionId: '$transactionHistory._id',
        type: '$transactionHistory.type',
        date: '$transactionHistory.date',
        amount: '$transactionHistory.amount',
        status: '$transactionHistory.status',
        orderId: 1,
      },
    },
    { $sort: { 'transactionHistory.date': -1 } }, // Sort by date descending
  ];

  const transactions = await OrderModel.aggregate(aggregationPipeline);

  // Pagination logic
  const totalDocs = transactions.length;
  const totalPages = Math.ceil(totalDocs / limit);
  const skipIndex = (page - 1) * limit;
  const paginatedTransactions = transactions.slice(skipIndex, skipIndex + limit);

  return {
    docs: paginatedTransactions,
    totalDocs,
    totalPages,
    page,
    limit,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  };
};

module.exports = {
  createOrder,
  processOnlinePayment,
  updateOrderStatus,
  getOrdersByUser,
  getOrderById,
  getPendingFoodRequests,
  getPendingRoomRequests,
  getPendingProductRequests,
  getOrdersByStatus,
  updatePartnerRequestStatus,
  updateDeliveryPartner,
  cancelOrder,
  getCompletedBookings,
  updateCompletedBookings,
  rebookRoomOrder,
  trackOrder,
  reorderItems,
  queryOrder,
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
  getApprovedRefundsByPartner,
  updateExpiredRefundsToAdmin,
  getTransactionHistoryForUserAndPartner,
};