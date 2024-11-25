const { BusinessModel, UserModel, BusinessTypeModel, DineOutModel, OrderModel } = require("../models");
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

        // Validate table management
        if (dineInStatus && tableManagement && Array.isArray(tableManagement)) {
            tableManagement.forEach(table => {
                if (!table.tableNumber || !table.seatingCapacity) {
                    throw new Error("Each table must have a table number and seating capacity.");
                }
                table.status = "available"; // Ensure status is defaulted to 'available'
            });
        }

        // Directly store operatingDetails in UTC format
        if (operatingDetails && operatingDetails.length > 0) {
            operatingDetails.forEach(detail => {
                if (!moment(detail.startTime, moment.ISO_8601, true).isValid() ||
                    !moment(detail.endTime, moment.ISO_8601, true).isValid()) {
                    throw new Error('Invalid startTime or endTime format. Use ISO 8601 UTC format.');
                }
            });
        }

        // Create the business
        const business = new BusinessModel({
            businessName,
            partner: partnerId,
            businessType,
            businessDescription,
            countryCode,
            mobile,
            email,
            businessAddress,
            openingDays,
            openingTime,
            closingTime,
            sameTimeForAllDays,
            uniformTiming,
            daywiseTimings,
            bannerImages,
            galleryImages,
            dineInStatus,
            operatingDetails, // Directly store in UTC
            tableManagement: dineInStatus ? tableManagement : [],
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
            availableTables: 0,
            bookedTables: 0,
            cancelledTables: 0,
            earnings: { total: 0, payout: 0 }
        };
    });

    // Fetch available table counts
    const availableTableCounts = await BusinessModel.aggregate([
        {
            $match: { partner: partnerId }
        },
        {
            $unwind: "$tableManagement"
        },
        {
            $match: { "tableManagement.status": "available" }
        },
        {
            $group: {
                _id: "$businessType",
                availableCount: { $sum: 1 }
            }
        }
    ]);

    availableTableCounts.forEach(entry => {
        const { _id: businessType, availableCount } = entry;
        if (counts[businessType]) {
            counts[businessType].availableTables = availableCount;
        }
    });

    // Fetch booked table counts
    const bookedTableCounts = await BusinessModel.aggregate([
        {
            $match: { partner: partnerId }
        },
        {
            $unwind: "$tableManagement"
        },
        {
            $match: { "tableManagement.status": "booked" }
        },
        {
            $group: {
                _id: "$businessType",
                bookedCount: { $sum: 1 }
            }
        }
    ]);

    bookedTableCounts.forEach(entry => {
        const { _id: businessType, bookedCount } = entry;
        if (counts[businessType]) {
            counts[businessType].bookedTables = bookedCount;
        }
    });

    // Fetch cancelled table counts
    const cancelledTableCounts = await BusinessModel.aggregate([
        {
            $match: { partner: partnerId }
        },
        {
            $unwind: "$tableManagement"
        },
        {
            $match: { "tableManagement.status": "cancelled" }
        },
        {
            $group: {
                _id: "$businessType",
                cancelledCount: { $sum: 1 }
            }
        }
    ]);

    cancelledTableCounts.forEach(entry => {
        const { _id: businessType, cancelledCount } = entry;
        if (counts[businessType]) {
            counts[businessType].cancelledTables = cancelledCount;
        }
    });

    // Fetch order counts
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
                availableTables: 0,
                bookedTables: 0,
                cancelledTables: 0,
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
            if (status === 'pending') countsForBusinessType.orderCounts.push({ title: 'current Room Bookings', count });
            if (status === 'confirmed') countsForBusinessType.orderCounts.push({ title: 'confirmed Room Bookings', count });
            if (status === 'accepted') countsForBusinessType.orderCounts.push({ title: 'accepted Room Bookings', count });
            if (status === 'rejected') countsForBusinessType.orderCounts.push({ title: 'rejected Room Bookings', count });
        }
        countsForBusinessType.earnings.total += earnings;
    });

    // Fetch dine-out counts
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
                availableTables: 0,
                bookedTables: 0,
                cancelledTables: 0,
                earnings: { total: 0, payout: 0 }
            };
        }

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
            counts[key].title = "Business Type";
        }
    });

    return Object.values(counts).map(businessTypeCounts => ({
        title: businessTypeCounts.title,
        availableTables: businessTypeCounts.availableTables,
        bookedTables: businessTypeCounts.bookedTables,
        cancelledTables: businessTypeCounts.cancelledTables,
        orderCounts: businessTypeCounts.orderCounts.map(order => ({
            ...order,
            searchKey: order.title
                .toLowerCase()
                .replace(/\s(.)/g, match => match.toUpperCase())  // Capitalize each word except the first
                .replace(/\s+/g, '')  // Remove spaces
        })),
        dineOutCounts: businessTypeCounts.dineOutCounts.map(dineOut => ({
            ...dineOut,
            searchKey: dineOut.title
                .toLowerCase()
                .replace(/\s(.)/g, match => match.toUpperCase())  // Capitalize each word except the first
                .replace(/\s+/g, '')  // Remove spaces
        })),
        earnings: businessTypeCounts.earnings
    }));
};

const getOrderListByType = async (partnerId, type, sort = "desc") => {
    // Fetch all businesses associated with the partner
    const businesses = await BusinessModel.find({ partner: partnerId }).select("_id businessName");

    if (!businesses || businesses.length === 0) {
        throw new Error("No businesses found for the partner.");
    }

    const businessIds = businesses.map(business => business._id);

    let query = { business: { $in: businessIds } };

    switch (type) {
        // Food Orders
        case "currentFoodOrders":
            query.orderStatus = "pending";
            break;
        case "confirmedFoodOrders":
            query.orderStatus = "accepted";
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
        case "currentRoomBookings":
            query.orderStatus = "pending";
            break;
        case "confirmedRoomBookings":
            query.orderStatus = "accepted";
            break;
        case "acceptedRoomBookings":
            query.orderStatus = "accepted";
            break;
        case "rejectedRoomBookings":
            query.orderStatus = "rejected";
            break;

        // Product Orders
        case "currentProductOrders":
            query.orderStatus = "pending";
            break;
        case "confirmedProductOrders":
            query.orderStatus = "accepted";
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
            query = { business: { $in: businessIds }, status: "Pending" };
            return await DineOutModel.find(query)
                .populate("user", "name")
                .populate("business", "businessName")
                .exec();
        case "acceptedDineOutRequests":
            query = { business: { $in: businessIds }, status: "Accepted" };
            return await DineOutModel.find(query)
                .populate("user", "name")
                .populate("business", "businessName")
                .exec();
        case "rejectedDineOutRequests":
            query = { business: { $in: businessIds }, status: "Rejected" };
            return await DineOutModel.find(query)
                .populate("user", "name")
                .populate("business", "businessName")
                .exec();
        case "completedDineOutRequests":
            query = { business: { $in: businessIds }, status: "Completed" };
            return await DineOutModel.find(query)
                .populate("user", "name")
                .populate("business", "businessName")
                .exec();
        case "cancelledDineOutRequests":
            query = { business: { $in: businessIds }, status: "Cancelled" };
            return await DineOutModel.find(query)
                .populate("user", "name")
                .populate("business", "businessName")
                .exec();

        // Available Tables
        case "availableTables":
            const businessesWithAvailableTables = await BusinessModel.aggregate([
                {
                    $match: { partner: new ObjectId(partnerId) }
                },
                {
                    $unwind: "$tableManagement"
                },
                {
                    $match: { "tableManagement.status": "available" }
                },
                {
                    $group: {
                        _id: "$_id",
                        businessName: { $first: "$businessName" },
                        availableTables: {
                            $push: {
                                tableNumber: "$tableManagement.tableNumber",
                                seatingCapacity: "$tableManagement.seatingCapacity",
                                status: "$tableManagement.status"
                            }
                        }
                    }
                }
            ]);

            return businessesWithAvailableTables.map(business => ({
                businessId: business._id,
                businessName: business.businessName,
                tables: business.availableTables
            }));

        // Booked Tables
        case "bookedTables":
            const businessesWithBookedTables = await BusinessModel.aggregate([
                {
                    $match: { partner: new ObjectId(partnerId) }
                },
                {
                    $unwind: "$tableManagement"
                },
                {
                    $match: { "tableManagement.status": "booked" }
                },
                {
                    $group: {
                        _id: "$_id",
                        businessName: { $first: "$businessName" },
                        bookedTables: {
                            $push: {
                                tableNumber: "$tableManagement.tableNumber",
                                seatingCapacity: "$tableManagement.seatingCapacity",
                                status: "$tableManagement.status"
                            }
                        }
                    }
                }
            ]);

            return businessesWithBookedTables.map(business => ({
                businessId: business._id,
                businessName: business.businessName,
                tables: business.bookedTables
            }));

        // Cancelled Tables
        case "cancelledTables":
            const businessesWithCancelledTables = await BusinessModel.aggregate([
                {
                    $match: { partner: new ObjectId(partnerId) }
                },
                {
                    $unwind: "$tableManagement"
                },
                {
                    $match: { "tableManagement.status": "cancelled" }
                },
                {
                    $group: {
                        _id: "$_id",
                        businessName: { $first: "$businessName" },
                        cancelledTables: {
                            $push: {
                                tableNumber: "$tableManagement.tableNumber",
                                seatingCapacity: "$tableManagement.seatingCapacity",
                                status: "$tableManagement.status"
                            }
                        }
                    }
                }
            ]);

            return businessesWithCancelledTables.map(business => ({
                businessId: business._id,
                businessName: business.businessName,
                tables: business.cancelledTables
            }));

        default:
            throw new Error("Invalid type for order list retrieval.");
    }

    // Determine sort order
    const sortOrder = sort === "asc" ? 1 : -1;

    // Fetch Food, Hotel, and Product Orders using OrderModel with itemType matching
    const orders = await OrderModel.find(query).sort({ createdAt: sortOrder }).populate({
        path: "items.item",
        match: {
            itemType: type.includes("Food") ? "food" :
                type.includes("Hotel") ? "room" :
                    type.includes("DineOut") ? null : // No need to filter for DineOut
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
const getAllBusinesses = async (businessType) => {
    let condition = {};

    // If businessType is provided, filter by the ObjectId of the BusinessType
    if (businessType) {
        const businessTypeDocument = await BusinessTypeModel.findOne({ name: businessType });
        if (businessTypeDocument) {
            // Filter by the ObjectId of the businessType
            condition.businessType = businessTypeDocument._id;
        } else {
            // If no matching businessType is found, throw an error or return empty result
            throw new Error("Invalid businessType provided.");
        }
    }

    // Fetch businesses based on the condition
    const businesses = await BusinessModel.find(condition);
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
    getAllBusinesses,
}