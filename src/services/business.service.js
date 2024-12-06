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
        countryCode,
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
    business.countryCode = countryCode || business.countryCode;
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
    if (!partner) throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG);

    // Get today's start and end timestamps
    const todayStart = moment().utc().startOf('day').toDate();
    const todayEnd = moment().utc().endOf('day').toDate();

    // Step 1: Get distinct business types for the partner
    const businessTypesFromBusinesses = await BusinessModel.distinct("businessType", {
        partner: new mongoose.Types.ObjectId(partnerId),
    });

    const allBusinessTypes = [...new Set(businessTypesFromBusinesses.map(id => id.toString()))];

    const counts = {};
    allBusinessTypes.forEach(type => {
        counts[type] = {
            title: "Unknown Type",
            orderCounts: [],
            dineOutCounts: [],
            availableTables: 0,
            bookedTables: 0,
            cancelledTables: 0,
            earnings: { total: 0, payout: 0 },
        };
    });

    // Step 2: Fetch available, booked, and cancelled table counts
    const tableStatuses = ["available", "booked", "cancelled"];
    for (const status of tableStatuses) {
        const tableCounts = await BusinessModel.aggregate([
            { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
            { $unwind: "$tableManagement" },
            { $match: { "tableManagement.status": status } },
            { $group: { _id: "$businessType", count: { $sum: 1 } } },
        ]);

        tableCounts.forEach(({ _id: businessType, count }) => {
            const typeKey = businessType.toString();
            if (!counts[typeKey]) return;

            if (status === "available") counts[typeKey].availableTables = count;
            else if (status === "booked") counts[typeKey].bookedTables = count;
            else if (status === "cancelled") counts[typeKey].cancelledTables = count;
        });
    }

    // Step 3: Fetch dine-out counts
    const dineOutCounts = await DineOutModel.aggregate([
        {
            $match: {
                partner: new mongoose.Types.ObjectId(partnerId),
                createdAt: { $gte: todayStart, $lte: todayEnd },
            },
        },
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
            $group: {
                _id: { status: "$status", businessType: "$businessDetails.businessType" },
                count: { $sum: 1 },
            },
        },
    ]);

    const dineOutSearchKeys = {
        pending: "pendingDineOutRequests",
        accepted: "acceptedDineOutRequests",
        rejected: "rejectedDineOutRequests",
        cancelled: "cancelledDineOutRequests",
    };

    dineOutCounts.forEach(({ _id, count }) => {
        const { status, businessType } = _id;
        const typeKey = businessType.toString();
        if (!counts[typeKey]) return;

        const searchKey = dineOutSearchKeys[status.toLowerCase()];
        if (searchKey) {
            counts[typeKey].dineOutCounts.push({ title: `${status} Requests`, count, searchKey });
        }
    });

    // Step 4: Fetch order counts and earnings
    const orderCounts = await OrderModel.aggregate([
        {
            $match: {
                partner: new mongoose.Types.ObjectId(partnerId),
                createdAt: { $gte: todayStart, $lte: todayEnd },
            },
        },
        { $unwind: "$items" },
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
            $group: {
                _id: {
                    status: "$orderStatus",
                    businessType: "$itemDetails.businessType",
                    itemType: "$itemDetails.itemType",
                },
                count: { $sum: 1 },
                earnings: { $sum: "$totalPrice" },
            },
        },
    ]);

    const orderSearchKeys = {
        food: {
            pending: "currentFoodOrders",
            accepted: "acceptedFoodOrders",
            rejected: "rejectedFoodOrders",
            delivered: "deliveredFoodOrders",
            cancelled: "cancelledFoodOrders",
        },
        room: {
            pending: "currentRoomBookings",
            accepted: "acceptedRoomBookings",
            rejected: "rejectedRoomBookings",
        },
        product: {
            pending: "currentProductOrders",
            accepted: "acceptedProductOrders",
            rejected: "rejectedProductOrders",
            delivered: "deliveredProductOrders",
            cancelled: "cancelledProductOrders",
        },
    };

    orderCounts.forEach(({ _id, count, earnings }) => {
        const { status, businessType, itemType } = _id;
        const typeKey = businessType.toString();
        if (!counts[typeKey]) return;

        const searchKey = orderSearchKeys[itemType]?.[status.toLowerCase()];
        if (searchKey) {
            counts[typeKey].orderCounts.push({ title: `${status} Orders`, count, searchKey });
        }
        counts[typeKey].earnings.total += earnings || 0;
    });

    // Step 5: Map business type names
    const businessTypeNames = await BusinessTypeModel.find({
        _id: { $in: allBusinessTypes.map(id => new mongoose.Types.ObjectId(id)) },
    }).select("_id name");

    businessTypeNames.forEach(({ _id, name }) => {
        if (counts[_id.toString()]) {
            counts[_id.toString()].title = name;
            counts[_id.toString()].searchKey = name.toLowerCase().replace(/\s+/g, "");
        }
    });

    return Object.values(counts);
};

const getOrderListByType = async (partnerId, type, sort = "desc") => {
    // Fetch all businesses associated with the partner
    const businesses = await BusinessModel.find({ partner: partnerId }).select("_id businessName");

    if (!businesses || businesses.length === 0) {
        throw new Error("No businesses found for the partner.");
    }

    const businessIds = businesses.map(business => business._id);

    // Get today's start and end timestamps
    const todayStart = moment().utc().startOf('day').toDate();
    const todayEnd = moment().utc().endOf('day').toDate();

    let query = {
        business: { $in: businessIds },
        createdAt: { $gte: todayStart, $lte: todayEnd }, // Add date filter
    };

    switch (type) {
        // Food Orders
        case "currentFoodOrders":
            query.orderStatus = "pending";
            break;
        case "confirmedFoodOrders":
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
            return await BusinessModel.aggregate([
                { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
                { $unwind: "$tableManagement" },
                { $match: { "tableManagement.status": "available" } },
                {
                    $group: {
                        _id: "$_id",
                        businessName: { $first: "$businessName" },
                        tables: {
                            $push: {
                                tableNumber: "$tableManagement.tableNumber",
                                seatingCapacity: "$tableManagement.seatingCapacity",
                            },
                        },
                    },
                },
            ]);

        // Booked Tables
        case "bookedTables":
            return await BusinessModel.aggregate([
                { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
                { $unwind: "$tableManagement" },
                { $match: { "tableManagement.status": "booked" } },
                {
                    $group: {
                        _id: "$_id",
                        businessName: { $first: "$businessName" },
                        tables: {
                            $push: {
                                tableNumber: "$tableManagement.tableNumber",
                                seatingCapacity: "$tableManagement.seatingCapacity",
                            },
                        },
                    },
                },
            ]);

        // Cancelled Tables
        case "cancelledTables":
            return await BusinessModel.aggregate([
                { $match: { partner: new mongoose.Types.ObjectId(partnerId) } },
                { $unwind: "$tableManagement" },
                { $match: { "tableManagement.status": "cancelled" } },
                {
                    $group: {
                        _id: "$_id",
                        businessName: { $first: "$businessName" },
                        tables: {
                            $push: {
                                tableNumber: "$tableManagement.tableNumber",
                                seatingCapacity: "$tableManagement.seatingCapacity",
                            },
                        },
                    },
                },
            ]);

        default:
            throw new Error("Invalid type for order list retrieval.");
    }

    // Determine sort order
    const sortOrder = sort === "asc" ? 1 : -1;

    // Fetch orders
    const orders = await OrderModel.find(query)
        .sort({ createdAt: sortOrder })
        .populate({
            path: "items.item",
            select: `
            itemType 
            dishName dishDescription dishPrice 
            roomName roomDescription roomPrice roomCapacity amenities 
            productName productDescription productFeatures productDeliveryCharge variants
        `,
        })
        .lean()
        .exec();

    // Determine target item type
    const targetItemType =
        type.includes("Room") ? "room" :
            type.includes("Food") ? "food" :
                type.includes("Product") ? "product" : null;
    // Filter orders based on item type
    const filteredOrders = orders.map(order => ({
        ...order,
        items: order.items
            .filter(item => item.item && item.item.itemType === targetItemType)
            .map(item => ({
                id: item._id,
                name: item.item.dishName || item.item.roomName || item.item.productName || null,
                description: item.item.dishDescription || item.item.roomDescription || item.item.productDescription || null,
                type: item.item.itemType,
                price: item.item.dishPrice || item.item.roomPrice || (item.item.variants?.[0]?.productPrice || null),
                features: item.item.productFeatures || null,
                deliveryCharge: item.item.foodDeliveryCharge || item.item.productDeliveryCharge || null,
                quantity: item.quantity,
                guestCount: item.item.itemType === 'room' ? item.quantity : undefined,
                checkIn: item.item.itemType === 'room' ? item.checkIn : undefined,
                checkOut: item.item.itemType === 'room' ? item.checkOut : undefined,
                amenities: item.item.itemType === 'room' ? item.item.amenities : undefined,
            })),
    }));
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
    getAllBusinesses
};