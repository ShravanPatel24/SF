const { BusinessModel, UserModel, BusinessTypeModel, ItemModel, DineOutModel, OrderModel } = require("../models");
const CONSTANTS = require("../config/constant");
const { s3Service } = require('../services');
const moment = require('moment');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const createBusinessForPartner = async (
    partnerId, businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays,
    openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus,
    operatingDetails, tableManagement
) => {
    try {
        const partner = await UserModel.findById(partnerId);
        if (!partner || partner.type !== "partner") {
            return { statusCode: 404, message: CONSTANTS.PARTNER_NOT_FOUND_MSG };
        }
        if (partner.name === businessName) {
            return { statusCode: 400, message: CONSTANTS.BUSINESS_AND_PARTNER_NAME_DUPLICATION };
        }
        const validBusinessType = await BusinessTypeModel.findById(businessType);
        if (!validBusinessType) {
            return { statusCode: 400, message: CONSTANTS.INVALID_BUSINESS_TYPE };
        }
        // Convert timings
        if (uniformTiming) {
            uniformTiming.openingTime = moment(`2024-10-10 ${uniformTiming.openingTime}`, 'YYYY-MM-DD hh:mm A').toDate();
            uniformTiming.closingTime = moment(`2024-10-10 ${uniformTiming.closingTime}`, 'YYYY-MM-DD hh:mm A').toDate();
        }
        if (daywiseTimings && daywiseTimings.length > 0) {
            daywiseTimings = daywiseTimings.map(day => ({
                ...day,
                openingTime: moment(`2024-10-10 ${day.openingTime}`, 'YYYY-MM-DD hh:mm A').toDate(),
                closingTime: moment(`2024-10-10 ${day.closingTime}`, 'YYYY-MM-DD hh:mm A').toDate(),
            }));
        }
        if (operatingDetails && operatingDetails.length > 0) {
            operatingDetails = operatingDetails.map(detail => ({
                ...detail,
                startTime: moment(`${detail.date}T${detail.startTime}`, 'YYYY-MM-DDTHH:mm:ssZ').toDate(),
                endTime: moment(`${detail.date}T${detail.endTime}`, 'YYYY-MM-DDTHH:mm:ssZ').toDate(),
            }));
        }
        const business = new BusinessModel({
            businessName, partner: partnerId, businessType, businessDescription, countryCode, mobile, email, businessAddress,
            openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages,
            dineInStatus, operatingDetails, tableManagement
        });
        await business.save();
        await UserModel.findByIdAndUpdate(partnerId, { businessId: business._id });
        return { statusCode: 201, data: business };
    } catch (error) {
        console.error("Error creating business:", error);
        return { statusCode: 500, message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG };
    }
};

/**
 * Get business details by ID
 * @param {ObjectId} businessId
 * @returns {Promise<Business>}
 */
const getBusinessById = async (businessId) => {
    // const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // console.log(userTimeZone);
    const business = await BusinessModel.findById(businessId)
        .populate("businessType", "name isProduct")
        .populate("partner", "name email mobile")
        .exec();
    if (!business) { throw new Error(CONSTANTS.BUSINESS_NOT_FOUND) }
    return business;
};

const getBusinessesForPartner = async (partnerId, options, page, limit) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG) }
    let query = { partner: partnerId };
    if (options.businessType) { query.businessType = options.businessType }
    if (options.searchBy) {
        query.$or = [
            { businessName: { $regex: options.searchBy, $options: "i" } },
            { email: { $regex: options.searchBy, $options: "i" } },
        ];
    }
    // Sorting functionality
    let sort = {};
    if (options.sortBy) {
        const sortField = options.sortBy.startsWith("-") ? options.sortBy.substring(1) : options.sortBy;
        const sortOrder = options.sortBy.startsWith("-") ? -1 : 1;
        sort[sortField] = sortOrder;
    } else {
        sort = { createdAt: -1 };  // Default sort by creation date, descending
    }
    // Pagination logic
    const skip = (page - 1) * limit;
    // Fetch businesses with pagination, sorting, and search applied
    const businesses = await BusinessModel.find(query)
        .populate("businessType", "name isProduct")
        .populate("partner", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();
    const totalDocs = await BusinessModel.countDocuments(query);
    return {
        docs: businesses,
        totalDocs,
        limit,
        totalPages: Math.ceil(totalDocs / limit),
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page * limit < totalDocs,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < totalDocs ? page + 1 : null,
    };
};

const getBusinessesByType = async (businessTypeId, page = 1, limit = 10, searchBy = '', sortBy = 'createdAt') => {
    const query = { businessType: businessTypeId };
    if (searchBy) { query.businessName = { $regex: searchBy, $options: 'i' } }
    const sortOptions = {};
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'businessName') {
        sortOptions[sortBy] = -1; // Sort descending by default
    } else {
        sortOptions['createdAt'] = -1; // Default fallback sorting
    }
    const businesses = await BusinessModel.paginate(query, {
        page,
        limit,
        sort: sortOptions, // Apply sorting
        populate: [
            { path: "businessType", select: "name isProduct" },
            { path: "partner", select: "name _id" },
        ],
    });
    return businesses;
};

/**
 * Update a business by ID
 * @param {ObjectId} businessId
 * @param {Object} updateBody
 * @param {Array} files
 * @returns {Promise<Business>}
 */
const updateBusinessById = async (businessId, updateBody, files = {}) => {
    const {
        businessName,
        businessDescription,
        mobile,
        email,
        businessAddress,
        openingDays,
        openingTime,
        closingTime,
        sameTimeForAllDays,
        uniformTiming,
        daywiseTimings,
        bannerImages,  // These come from the request body
        galleryImages, // These come from the request body
        dineInStatus,
        operatingDetails,
        tableManagement
    } = updateBody;

    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error(CONSTANTS.BUSINESS_NOT_FOUND);
    }

    // Safely handle files (default to empty arrays if undefined)
    const bannerFiles = files.bannerImages || [];
    const galleryFiles = files.galleryImages || [];

    // Upload new banner images if they are present in the request
    let bannerImageUrls = business.bannerImages; // Keep existing images
    if (bannerFiles.length > 0) {
        bannerImageUrls = await uploadBusinessImages(bannerFiles, "bannerImages", bannerImages);
    }

    // Upload new gallery images if they are present in the request
    let galleryImageUrls = business.galleryImages; // Keep existing images
    if (galleryFiles.length > 0) {
        galleryImageUrls = await uploadBusinessImages(galleryFiles, "galleryImages", galleryImages);
    }

    // Update business fields only if they are present in the updateBody
    business.businessName = businessName || business.businessName;
    business.businessDescription = businessDescription || business.businessDescription;
    business.mobile = mobile || business.mobile;
    business.email = email || business.email;
    business.businessAddress = businessAddress || business.businessAddress;
    business.openingDays = openingDays || business.openingDays;
    business.openingTime = openingTime || business.openingTime;
    business.closingTime = closingTime || business.closingTime;
    business.sameTimeForAllDays = sameTimeForAllDays !== undefined ? sameTimeForAllDays : business.sameTimeForAllDays;
    business.uniformTiming = uniformTiming || business.uniformTiming;
    business.daywiseTimings = daywiseTimings || business.daywiseTimings;
    business.bannerImages = bannerImageUrls; // Use updated or existing images
    business.galleryImages = galleryImageUrls; // Use updated or existing images
    business.dineInStatus = dineInStatus !== undefined ? dineInStatus : business.dineInStatus;
    business.operatingDetails = operatingDetails || business.operatingDetails;
    business.tableManagement = tableManagement || business.tableManagement;

    await business.save();
    return business;
};

// S3 Image Upload Logic
const uploadBusinessImages = async (files, folderName) => {
    let imageUrls = [];
    if (files && files.length > 0) {
        const uploadResults = await s3Service.uploadDocuments(files, folderName);
        imageUrls = uploadResults.map((upload) => upload.key);
    }
    return imageUrls;
};

/**
 * Delete a business by ID
 * @param {ObjectId} businessId
 * @returns {Promise<void>}
 */
const deleteBusinessById = async (businessId) => {
    // Fetch the business details from the database
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error(CONSTANTS.BUSINESS_NOT_FOUND);
    }

    // Extract the S3 keys from the banner images
    const bannerImageKeys = business.bannerImages.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];  // Extract the key part
    });

    // Extract the S3 keys from the gallery images
    const galleryImageKeys = business.galleryImages.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];  // Extract the key part
    });

    // Delete banner images from S3
    if (bannerImageKeys.length > 0) {
        await s3Service.deleteFromS3(bannerImageKeys);
    }

    // Delete gallery images from S3
    if (galleryImageKeys.length > 0) {
        await s3Service.deleteFromS3(galleryImageKeys);
    }

    // Delete the business from the database
    await BusinessModel.findByIdAndDelete(businessId);
};

const findBusinessesNearUser = async (latitude, longitude, radiusInKm, page = 1, limit = 10, businessTypeId, search) => {
    const radiusInMeters = radiusInKm * 1000; // Convert km to meters

    const query = {};
    if (businessTypeId) {
        query.businessType = new ObjectId(businessTypeId);
    }

    // Apply search filter if search term is provided
    if (search) {
        query.$or = [
            { businessName: { $regex: search, $options: "i" } }, // Case-insensitive search on business name
            { businessDescription: { $regex: search, $options: "i" } }, // Case-insensitive search on description
            { "businessAddress.city": { $regex: search, $options: "i" } }, // Case-insensitive search on city
            { "businessAddress.state": { $regex: search, $options: "i" } } // Case-insensitive search on state
        ];
    }

    const businesses = await BusinessModel.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)], // [longitude, latitude]
                },
                distanceField: "distance", // This will add a field called `distance` to each document
                maxDistance: radiusInMeters, // Maximum distance in meters
                spherical: true, // For spherical coordinates
                query: query, // Filter by businessTypeId and search if provided
            },
        },
        { $skip: (page - 1) * limit }, // Skip the documents for pagination
        { $limit: limit } // Limit the number of documents per page
    ]);

    // Get total number of businesses matching the geospatial query and filters
    const totalDocs = await BusinessModel.countDocuments({
        ...query,
        "businessAddress.location": {
            $geoWithin: {
                $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], radiusInKm / 6378.1], // Radius in kilometers
            },
        },
    });

    const totalPages = Math.ceil(totalDocs / limit);
    return {
        docs: businesses,
        totalDocs,
        limit,
        totalPages,
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page * limit < totalDocs,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < totalDocs ? page + 1 : null,
    };
};

const findNearbyHotelsWithRooms = async (latitude, longitude, radiusInKm, checkIn, checkOut, guests, roomQuantity, page = 1, limit = 10) => {
    const radiusInMeters = radiusInKm * 1000;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    console.log(`Parameters - Latitude: ${latitude}, Longitude: ${longitude}, Radius: ${radiusInKm}`);
    console.log(`Check-in: ${checkInDate}, Check-out: ${checkOutDate}, Guests: ${guests}, Room Quantity: ${roomQuantity}`);

    // Modify the query to use a case-insensitive regex search
    const hotelBusinessType = await BusinessTypeModel.findOne({
        name: { $regex: /^hotel(s)?$/i } // Matches "Hotel", "Hotels", "hotel", or "hotels" case-insensitively
    }).select('_id');

    if (!hotelBusinessType) {
        throw new Error("Hotel business type not found.");
    }
    console.log(`Hotel Business Type ID: ${hotelBusinessType._id}`);

    const geoNearResults = await BusinessModel.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                distanceField: "distance",
                maxDistance: radiusInMeters,
                spherical: true,
                query: { businessType: hotelBusinessType._id }
            }
        }
    ]);

    console.log("GeoNear Results:", JSON.stringify(geoNearResults, null, 2));

    if (geoNearResults.length === 0) {
        console.log("No hotels found in the specified radius.");
        return [];
    }

    const hotels = await BusinessModel.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
                distanceField: "distance",
                maxDistance: radiusInMeters,
                spherical: true,
                query: { businessType: hotelBusinessType._id }
            }
        },
        {
            $lookup: {
                from: "items", // The collection name for your items
                localField: "_id",
                foreignField: "business",
                as: "rooms"
            }
        },
        {
            $addFields: {
                availableRooms: {
                    $filter: {
                        input: "$rooms",
                        as: "room",
                        cond: {
                            $and: [
                                // { $eq: ["$$room.itemType", "room"] },
                                // { $eq: ["$$room.available", true] },
                                // { $gte: ["$$room.roomCapacity", guests] }
                            ]
                        }
                    }
                }
            }
        },
        {
            $match: {
                "availableRooms.0": { $exists: true },
                $expr: { $gte: [{ $size: "$availableRooms" }, roomQuantity] }
            }
        },
        {
            $addFields: {
                pricePerNight: { $min: "$availableRooms.roomPrice" },
                taxPerNight: { $min: "$availableRooms.roomTax" },
                image: { $arrayElemAt: ["$bannerImages", 0] },
                location: {
                    $concat: [
                        { $ifNull: ["$businessAddress.street", ""] }, ", ",
                        { $ifNull: ["$businessAddress.city", ""] }, ", ",
                        { $ifNull: ["$businessAddress.state", ""] }, ", ",
                        { $ifNull: ["$businessAddress.country", ""] }
                    ]
                }
            }
        },
        { $project: { businessName: 1, pricePerNight: 1, taxPerNight: 1, image: 1, location: 1, availableRooms: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ]);

    console.log("Rooms after lookup:", JSON.stringify(hotels, null, 2));
    console.log("Hotels after processing:", JSON.stringify(hotels, null, 2));

    return {
        docs: hotels,
        totalDocs: hotels.length,
        limit,
        totalPages: Math.ceil(hotels.length / limit),
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page * limit < hotels.length,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < hotels.length ? page + 1 : null
    };
};

// Get Partner Dashboard count
const getDashboardCountsForPartner = async (partnerId) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || !partner.businessType) {
        throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG);
    }

    const businessTypes = Array.isArray(partner.businessType) ? partner.businessType : [partner.businessType];
    const todayStart = moment().utc().startOf('day').toDate();
    const todayEnd = moment().utc().endOf('day').toDate();

    // Initialize counts based on partner's business types with earnings and payout set to 0 by default
    const counts = {};
    businessTypes.forEach(type => {
        counts[type] = {
            title: type,
            orderCounts: [],
            dineOutCounts: [],
            earnings: { total: 0, payout: 0 }
        };
    });

    const orderCounts = await OrderModel.aggregate([
        {
            $match: {
                partner: partnerId,
                createdAt: { $gte: todayStart, $lte: todayEnd }
            }
        },
        { $unwind: "$items" },
        {
            $lookup: {
                from: 'items',
                localField: 'items.item',
                foreignField: '_id',
                as: 'itemDetails'
            }
        },
        { $unwind: "$itemDetails" },
        {
            $group: {
                _id: {
                    status: "$orderStatus",
                    itemType: "$itemDetails.itemType",
                    businessType: "$itemDetails.businessType"
                },
                count: { $sum: 1 },
                earnings: { $sum: "$totalPrice" }
            }
        }
    ]);

    orderCounts.forEach(entry => {
        const { status, itemType, businessType } = entry._id;
        const count = entry.count;
        const earnings = entry.earnings || 0;

        if (!counts[businessType]) {
            counts[businessType] = {
                title: businessType,
                orderCounts: [],
                dineOutCounts: [],
                earnings: { total: 0, payout: 0 }
            };
        }

        const countsForBusinessType = counts[businessType];

        if (itemType === 'product') {
            if (status === 'pending') countsForBusinessType.orderCounts.push({ title: 'current Product Orders', count });
            if (status === 'confirmed') countsForBusinessType.orderCounts.push({ title: 'confirmed Product Orders', count });
            if (status === 'accepted') countsForBusinessType.orderCounts.push({ title: 'accepted Product Orders', count });
            if (status === 'rejected') countsForBusinessType.orderCounts.push({ title: 'rejected Product Orders', count });
            if (status === 'delivered') countsForBusinessType.orderCounts.push({ title: 'delivered Product Orders', count });
            if (status === 'cancelled') countsForBusinessType.orderCounts.push({ title: 'cancelled Product Orders', count });
        } else if (itemType === 'food') {
            if (status === 'pending') countsForBusinessType.orderCounts.push({ title: 'current Food Orders', count });
            if (status === 'confirmed') countsForBusinessType.orderCounts.push({ title: 'confirmed Food Orders', count });
            if (status === 'accepted') countsForBusinessType.orderCounts.push({ title: 'accepted Food Orders', count });
            if (status === 'rejected') countsForBusinessType.orderCounts.push({ title: 'rejected Food Orders', count });
            if (status === 'delivered') countsForBusinessType.orderCounts.push({ title: 'delivered Food Orders', count });
            if (status === 'cancelled') countsForBusinessType.orderCounts.push({ title: 'cancelled Food Orders', count });
        } else if (itemType === 'room') {
            if (status === 'pending') countsForBusinessType.orderCounts.push({ title: 'current Bookings', count });
            if (status === 'confirmed') countsForBusinessType.orderCounts.push({ title: 'confirmed Bookings', count });
            if (status === 'accepted') countsForBusinessType.orderCounts.push({ title: 'accepted Bookings', count });
            if (status === 'rejected') countsForBusinessType.orderCounts.push({ title: 'rejected Bookings', count });
        }
        countsForBusinessType.earnings.total += earnings;
    });

    const dineOutCounts = await DineOutModel.aggregate([
        {
            $match: {
                partner: partnerId,
                createdAt: { $gte: todayStart, $lte: todayEnd }
            }
        },
        {
            $lookup: {
                from: 'businesses',  // Replace with the actual collection name for Business
                localField: 'business',
                foreignField: '_id',
                as: 'businessDetails'
            }
        },
        { $unwind: '$businessDetails' },
        {
            $group: {
                _id: {
                    status: "$status",
                    businessType: "$businessDetails.businessType"
                },
                count: { $sum: 1 }
            }
        }
    ]);

    // Define status mapping
    const statusMapping = {
        pending: "booking Requests",
        confirmed: "confirmed Requests",
        accepted: "accepted Requests",
        rejected: "rejected Requests",
        completed: "completed Requests",
        cancelled: "cancelled Requests"
    };

    dineOutCounts.forEach(entry => {
        const { status, businessType } = entry._id;
        const count = entry.count;

        if (!counts[businessType]) {
            counts[businessType] = {
                title: businessType,
                orderCounts: [],
                dineOutCounts: [],
                earnings: { total: 0, payout: 0 }
            };
        }

        // Apply status mapping here
        const mappedTitle = statusMapping[status.toLowerCase()] || status.toLowerCase();
        counts[businessType].dineOutCounts.push({ title: mappedTitle, count });
    });

    // Retrieve names for business types
    const businessTypeNames = await BusinessTypeModel.find({
        _id: { $in: Object.keys(counts) }
    }).select('_id name');

    businessTypeNames.forEach(({ _id, name }) => {
        if (counts[_id]) {
            counts[_id].title = name;
        }
    });

    // Set default title for any remaining IDs without a name
    Object.keys(counts).forEach(key => {
        if (typeof counts[key].title === 'object') {  // If the title is still an ObjectId
            counts[key].title = "Unknown Business Type";
        }
    });

    return Object.values(counts).map(businessTypeCounts => ({
        title: businessTypeCounts.title,
        orderCounts: businessTypeCounts.orderCounts,
        dineOutCounts: businessTypeCounts.dineOutCounts,
        earnings: businessTypeCounts.earnings
    }));
};

const getOrderListByType = async (partnerId, type) => {
    let query = { partner: partnerId };

    // Set the order status or other conditions based on the type
    switch (type) {
        // Food Orders
        case "currentFoodOrders":
            query.orderStatus = "pending";
            break;
        case "confirmedFoodOrders":
            query.orderStatus = "confirmed";
            break;
        case "acceptedFoodOrders":
            query.orderStatus = "accepted";
            break;
        case "rejectedFoodOrders":
            query.orderStatus = "rejected";
            break;
        case "deliveredFoodOrders":
            query.orderStatus = "delivered";
            break;
        case "cancelledFoodOrders":
            query.orderStatus = "cancelled";
            break;

        // Hotel Bookings
        case "currentHotelBookings":
            query.orderStatus = "pending";
            break;
        case "confirmedHotelBookings":
            query.orderStatus = "confirmed";
            break;
        case "acceptedHotelBookings":
            query.orderStatus = "accepted";
            break;
        case "rejectedHotelBookings":
            query.orderStatus = "rejected";
            break;

        // Product Orders
        case "currentProductOrders":
            query.orderStatus = "pending";
            break;
        case "confirmedProductOrders":
            query.orderStatus = "confirmed";
            break;
        case "acceptedProductOrders":
            query.orderStatus = "accepted";
            break;
        case "rejectedProductOrders":
            query.orderStatus = "rejected";
            break;
        case "deliveredProductOrders":
            query.orderStatus = "delivered";
            break;
        case "cancelledProductOrders":
            query.orderStatus = "cancelled";
            break;

        // Dine-Out Requests
        case "pendingDineOutRequests":
            query = { partner: partnerId, status: "Pending" };
            break;
        case "confirmedDineOutRequests":
            query = { partner: partnerId, status: "Confirmed" };
            break;
        case "acceptedDineOutRequests":
            query = { partner: partnerId, status: "Accepted" };
            break;
        case "rejectedDineOutRequests":
            query = { partner: partnerId, status: "Rejected" };
            break;
        case "completedDineOutRequests":
            query = { partner: partnerId, status: "Completed" };
            break;
        case "cancelledDineOutRequests":
            query = { partner: partnerId, status: "Cancelled" };
            break;

        // Available Tables (Assuming a separate table or collection handles table management)
        case "availableTables":
            query = { partner: partnerId, "tableManagement.status": "available" };
            break;

        default:
            throw new Error("Invalid type for order list retrieval.");
    }

    // Fetch orders or requests based on type and populate items where applicable
    const orders = await OrderModel.find(query).populate({
        path: "items.item",
        match: {
            itemType: type.includes("Food") ? "food" :
                type.includes("Hotel") ? "room" :
                    type.includes("DineOut") ? null :  // No need to filter for DineOut
                        "product"
        },
        select: "-__v" // Adjust fields as needed
    }).exec();

    // Filter to include only entries with populated items (for orders with items)
    const filteredOrders = orders.filter(order =>
        order.items.some(item => item.item) || type.includes("DineOut") || type.includes("Table")
    );

    return filteredOrders;
};

// Get all businesses for guests
const getAllBusinesses = async () => {
    // const condition = { isDelete: 1, status: 1 };
    const businesses = await BusinessModel.find();
    return businesses;
};

module.exports = {
    createBusinessForPartner,
    getBusinessById,
    getBusinessesForPartner,
    getBusinessesByType,
    updateBusinessById,
    uploadBusinessImages,
    deleteBusinessById,
    findBusinessesNearUser,
    findNearbyHotelsWithRooms,
    getDashboardCountsForPartner,
    getOrderListByType,
    getAllBusinesses
}