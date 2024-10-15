const { BusinessModel, UserModel, BusinessTypeModel, ItemModel, DineOutModel } = require("../models");
const CONSTANTS = require("../config/constant");
const { s3Service } = require('../services');
const moment = require('moment');

const createBusinessForPartner = async (partnerId, businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus, operatingDetails, tableManagement
) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG); }
    if (partner.name === businessName) { throw new Error(CONSTANTS.BUSINESS_AND_PARTNER_NAME_DUPLICATION); }
    const validBusinessType = await BusinessTypeModel.findById(businessType);
    if (!validBusinessType) { throw new Error(CONSTANTS.INVALID_BUSINESS_TYPE); }
    // Step 1: Convert uniformTiming times to Date objects (use today's date or a placeholder date)
    if (uniformTiming) {
        uniformTiming.openingTime = moment(`2024-10-10 ${uniformTiming.openingTime}`, 'YYYY-MM-DD hh:mm A').toDate();
        uniformTiming.closingTime = moment(`2024-10-10 ${uniformTiming.closingTime}`, 'YYYY-MM-DD hh:mm A').toDate();
    }
    // Step 2: Convert daywiseTimings times to Date objects (using a placeholder date)
    if (daywiseTimings && daywiseTimings.length > 0) {
        daywiseTimings = daywiseTimings.map(day => ({
            ...day,
            openingTime: moment(`2024-10-10 ${day.openingTime}`, 'YYYY-MM-DD hh:mm A').toDate(),
            closingTime: moment(`2024-10-10 ${day.closingTime}`, 'YYYY-MM-DD hh:mm A').toDate(),
        }));
    }
    // Step 3: Convert operatingDetails times to Date objects using the specific date from the detail
    if (operatingDetails && operatingDetails.length > 0) {
        operatingDetails = operatingDetails.map(detail => ({
            ...detail,
            startTime: moment(`${detail.date}T${detail.startTime}`, 'YYYY-MM-DDTHH:mm:ssZ').toDate(),
            endTime: moment(`${detail.date}T${detail.endTime}`, 'YYYY-MM-DDTHH:mm:ssZ').toDate(),
        }));
    }
    const business = new BusinessModel({
        businessName, partner: partnerId, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus, operatingDetails, tableManagement
    });
    await business.save();
    await UserModel.findByIdAndUpdate(partnerId, { businessId: business._id });
    return business;
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

const findBusinessesNearUser = async (latitude, longitude, radiusInKm, page = 1, limit = 10) => {
    const radiusInMeters = radiusInKm * 1000; // Convert km to meters
    const businesses = await BusinessModel.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [longitude, latitude], // [longitude, latitude]
                },
                distanceField: "distance", // This will add a field called `distance` to each document
                maxDistance: radiusInMeters, // Maximum distance in meters
                spherical: true, // For spherical coordinates
            }
        },
        {
            $skip: (page - 1) * limit // Skip the documents for pagination
        },
        {
            $limit: limit // Limit the number of documents per page
        }
    ]);
    // Get total number of businesses matching the geospatial query
    const totalDocs = await BusinessModel.countDocuments({
        "businessAddress.location": {
            $geoWithin: {
                $centerSphere: [[longitude, latitude], radiusInKm / 6378.1] // Radius in kilometers converted for spherical calculation
            }
        }
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


// Get Partner Dashboard count
const getDashboardCountsForPartner = async (partnerId) => {
    // Check if the partner exists
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") {
        throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG);
    }

    // Counts for food items
    const foodCounts = await ItemModel.aggregate([
        { $match: { itemType: 'food', business: partner.businessId } },
        {
            $group: {
                _id: null,
                availableTable: {
                    $sum: { $cond: [{ $eq: ['$available', true] }, 1, 0] }
                },
                bookingRequests: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                },
                currentFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
                },
                confirmedFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
                },
                acceptedFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                },
                rejectedFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
                },
                deliveredFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
                },
                cancelledFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
                },
                bookedTable: {
                    $sum: { $cond: [{ $eq: ['$bookedTable', true] }, 1, 0] }
                },
                cancelledTableBooking: {
                    $sum: { $cond: [{ $eq: ['$tableBookingStatus', 'Cancelled'] }, 1, 0] }
                },
                earnings: { $sum: '$earnings' }
            }
        }
    ]);

    // Counts for dine-out requests
    const dineOutCounts = await DineOutModel.aggregate([
        { $match: { partner: partnerId } },
        {
            $group: {
                _id: null,
                bookingRequests: {
                    $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                },
                currentFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
                },
                confirmedFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
                },
                acceptedFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                },
                rejectedFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
                },
                deliveredFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
                },
                cancelledFoodOrder: {
                    $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
                },
                bookedTable: {
                    $sum: { $cond: [{ $eq: ['$bookedTable', true] }, 1, 0] }
                },
                cancelledTableBooking: {
                    $sum: { $cond: [{ $eq: ['$tableBookingStatus', 'Cancelled'] }, 1, 0] }
                },
                earnings: { $sum: '$earnings' } // Assuming you have an earnings field in your DineOut model
            }
        }
    ]);

    // Counts for room items
    const roomCounts = await ItemModel.aggregate([
        { $match: { itemType: 'room', business: partner.businessId } },

        {
            $group: {
                _id: null,
                currentHotelBooking: {
                    $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
                },
                confirmedHotelBooking: {
                    $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
                },
                acceptedHotelBooking: {
                    $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                },
                rejectedHotelBooking: {
                    $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
                },
                earnings: { $sum: '$earnings' } // Assuming you have an earnings field in your Room model
            }
        }
    ]);

    // Counts for product items
    const productCounts = await ItemModel.aggregate([
        { $match: { itemType: 'product', business: partner.businessId } },
        {
            $group: {
                _id: null,
                currentProduct: {
                    $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
                },
                confirmedProduct: {
                    $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] }
                },
                acceptedProduct: {
                    $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
                },
                rejectedProduct: {
                    $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
                },
                deliveredProduct: {
                    $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] }
                },
                cancelledProduct: {
                    $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
                },
                earnings: { $sum: '$earnings' } // Assuming you have an earnings field in your Product model
            }
        }
    ]);

    return {
        foodItem: foodCounts[0] || {},
        dineOut: dineOutCounts[0] || {},
        roomItem: roomCounts[0] || {},
        productItem: productCounts[0] || {},
    };
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

module.exports = {
    createBusinessForPartner,
    getBusinessById,
    getBusinessesForPartner,
    getBusinessesByType,
    updateBusinessById,
    uploadBusinessImages,
    deleteBusinessById,
    findBusinessesNearUser,
    getDashboardCountsForPartner,
    calculateEarningsForPartner
}