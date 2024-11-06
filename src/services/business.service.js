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
    if (!partner || partner.type !== "partner") {
        throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG);
    }

    // Initialize response structure
    const counts = {
        restaurants: {
            availableTables: 0,
            bookingRequests: 0,
            currentFoodOrders: 0,
            confirmedFoodOrders: 0,
            acceptedFoodOrders: 0,
            rejectedFoodOrders: 0,
            deliveredFoodOrders: 0,
            cancelledFoodOrders: 0,
            earnings: 0
        },
        products: {
            currentProductOrders: 0,
            confirmedProductOrders: 0,
            acceptedProductOrders: 0,
            rejectedProductOrders: 0,
            deliveredProductOrders: 0,
            cancelledProductOrders: 0,
            earnings: 0
        },
        hotels: {
            currentBookings: 0,
            confirmedBookings: 0,
            acceptedBookings: 0,
            rejectedBookings: 0,
            earnings: 0
        },
        dineOut: {
            pendingRequests: 0,
            confirmedRequests: 0,
            acceptedRequests: 0,
            rejectedRequests: 0,
            completedRequests: 0,
            cancelledRequests: 0
        }
    };

    // 1. Retrieve Restaurant Counts
    const restaurantCounts = await DineOutModel.aggregate([
        { $match: { partner: partnerId } },
        {
            $group: {
                _id: null,
                bookingRequests: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
                currentFoodOrders: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
                confirmedFoodOrders: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
                acceptedFoodOrders: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
                rejectedFoodOrders: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
                deliveredFoodOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
                cancelledFoodOrders: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                earnings: { $sum: '$earnings' }
            }
        },
        { $project: { _id: 0 } } // Exclude _id from the output
    ]);
    if (restaurantCounts[0]) {
        Object.assign(counts.restaurants, restaurantCounts[0]);
    }

    // 2. Retrieve Product Counts
    const productCounts = await ItemModel.aggregate([
        { $match: { itemType: 'product', business: partner.businessId } },
        {
            $group: {
                _id: null,
                currentProductOrders: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
                confirmedProductOrders: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
                acceptedProductOrders: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
                rejectedProductOrders: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
                deliveredProductOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
                cancelledProductOrders: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                earnings: { $sum: '$earnings' }
            }
        },
        { $project: { _id: 0 } } // Exclude _id from the output
    ]);
    if (productCounts[0]) {
        Object.assign(counts.products, productCounts[0]);
    }

    // 3. Retrieve Hotel Counts
    const hotelCounts = await ItemModel.aggregate([
        { $match: { itemType: 'room', business: partner.businessId } },
        {
            $group: {
                _id: null,
                currentBookings: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
                confirmedBookings: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
                acceptedBookings: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
                rejectedBookings: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
                earnings: { $sum: '$earnings' }
            }
        },
        { $project: { _id: 0 } } // Exclude _id from the output
    ]);
    if (hotelCounts[0]) {
        Object.assign(counts.hotels, hotelCounts[0]);
    }

    // 4. Retrieve Dine-Out Counts
    const dineOutCounts = await DineOutModel.aggregate([
        { $match: { partner: partnerId } },
        {
            $group: {
                _id: null,
                pendingRequests: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
                confirmedRequests: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
                acceptedRequests: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
                rejectedRequests: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
                completedRequests: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
                cancelledRequests: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }
            }
        },
        { $project: { _id: 0 } } // Exclude _id from the output
    ]);
    if (dineOutCounts[0]) {
        Object.assign(counts.dineOut, dineOutCounts[0]);
    }

    return counts;
};

const getOrderListByType = async (partnerId, type) => {
    let query = { partner: partnerId };

    switch (type) {
        // Restaurant (Food Orders)
        case "currentFoodOrders":
            query.orderStatus = "processing";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "food" }
            }).exec();

        case "confirmedFoodOrders":
            query.orderStatus = "accepted";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "food" }
            }).exec();

        case "acceptedFoodOrders":
            query.orderStatus = "accepted";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "food" }
            }).exec();

        case "rejectedFoodOrders":
            query.orderStatus = "rejected";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "food" }
            }).exec();

        case "deliveredFoodOrders":
            query.orderStatus = "delivered";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "food" }
            }).exec();

        case "cancelledFoodOrders":
            query.orderStatus = "cancelled";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "food" }
            }).exec();

        // Dine Out
        case "availableTables":
            return BusinessModel.findOne({ partner: partnerId, dineInStatus: true })
                .select("tableManagement")
                .then(business => {
                    if (business && business.tableManagement) {
                        return business.tableManagement.filter(table => table.status === "available");
                    }
                    return [];
                });

        case "bookedTables":
            return BusinessModel.findOne({ partner: partnerId, dineInStatus: true })
                .select("tableManagement")
                .then(business => {
                    if (business && business.tableManagement) {
                        return business.tableManagement.filter(table => table.status === "booked");
                    }
                    return [];
                });

        case "cancelledTables":
            return BusinessModel.findOne({ partner: partnerId, dineInStatus: true })
                .select("tableManagement")
                .then(business => {
                    if (business && business.tableManagement) {
                        return business.tableManagement.filter(table => table.status === "cancelled");
                    }
                    return [];
                });

        case "bookingRequests":
            return DineOutModel.find({ partner: partnerId, status: "Pending" }).populate("user", "name").exec();

        // Hotels (Room Bookings)
        case "currentHotelBookings":
            query.orderStatus = "processing";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "room" }
            }).exec();

        case "confirmedHotelBookings":
            query.orderStatus = "accepted";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "room" }
            }).exec();

        case "acceptedHotelBookings":
            query.orderStatus = "accepted";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "room" }
            }).exec();

        case "rejectedHotelBookings":
            query.orderStatus = "rejected";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "room" }
            }).exec();

        // Products (Product Orders)
        case "currentProductOrders":
            query.orderStatus = "processing";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "product" }
            }).exec();

        case "confirmedProductOrders":
            query.orderStatus = "accepted";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "product" }
            }).exec();

        case "acceptedProductOrders":
            query.orderStatus = "accepted";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "product" }
            }).exec();

        case "rejectedProductOrders":
            query.orderStatus = "rejected";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "product" }
            }).exec();

        case "deliveredProductOrders":
            query.orderStatus = "delivered";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "product" }
            }).exec();

        case "cancelledProductOrders":
            query.orderStatus = "cancelled";
            return OrderModel.find(query).populate({
                path: "items.item",
                match: { itemType: "product" }
            }).exec();

        default:
            throw new Error("Invalid type for order list retrieval.");
    }
};

const calculateEarningsForPartner = async (partnerId) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") {
        throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG);
    }

    // Initialize earnings object
    const earnings = {
        totalEarnings: 0,
        businesses: {}
    };

    // Calculate earnings from items (food, room, product)
    const itemEarnings = await ItemModel.aggregate([
        { $match: { business: partner.businessId } }, // Ensure this matches the correct business ID
        {
            $group: {
                _id: '$business',
                totalEarnings: { $sum: { $multiply: ['$roomPrice', 1] } } // Use roomPrice, productPrice, etc.
            }
        }
    ]);

    // Add item earnings to earnings object
    itemEarnings.forEach(item => {
        earnings.totalEarnings += item.totalEarnings;
        earnings.businesses[item._id] = { totalEarnings: item.totalEarnings };
    });

    // Calculate earnings from dine-out requests
    const dineOutEarnings = await DineOutModel.aggregate([
        { $match: { partner: partnerId } }, // Ensure to match the partner ID
        {
            $group: {
                _id: '$business', // Group by business ID
                totalEarnings: { $sum: '$totalPrice' } // Adjust based on your field for total price
            }
        }
    ]);
    // Add dine-out earnings to earnings object
    dineOutEarnings.forEach(dineOut => {
        earnings.totalEarnings += dineOut.totalEarnings;
        if (!earnings.businesses[dineOut._id]) {
            earnings.businesses[dineOut._id] = { totalEarnings: 0 };
        }
        earnings.businesses[dineOut._id].totalEarnings += dineOut.totalEarnings;
    });

    return earnings;
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
    calculateEarningsForPartner,
    getAllBusinesses
}