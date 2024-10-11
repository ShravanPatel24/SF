const { BusinessModel, UserModel, BusinessTypeModel } = require("../models");
const CONSTANTS = require("../config/constant");
const awsS3Service = require("../lib/aws_S3");
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
    const business = await BusinessModel.findById(businessId)
        .populate("businessType", "name isProduct")
        .populate("partner", "name email mobile")
        .exec();
    if (!business) { throw new Error(CONSTANTS.BUSINESS_NOT_FOUND) }
    return business;
};

const getBusinessesForPartner = async (partnerId) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG) }
    const businesses = await BusinessModel.find({ partner: partnerId })
        .populate("businessType", "name isProduct")
        .populate("partner", "name")
        .exec();
    return businesses;
};

const queryBusinesses = async (partnerId, options, page = 1, limit = 10) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG); }

    const { sortBy, searchBy, businessType } = options;
    let query = { partner: partnerId };

    if (businessType) { query.businessType = businessType; }
    if (searchBy) { query.businessName = { $regex: searchBy, $options: "i" }; }

    // Use paginate method for pagination
    const businesses = await BusinessModel.paginate(query, {
        page,
        limit,
        sort: { createdAt: sortBy === "desc" ? -1 : 1 },
        populate: [
            { path: "businessType", select: "businessType _id" },
            { path: "partner", select: "name _id" },
        ],
    });
    return businesses;
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
const updateBusinessById = async (businessId, updateBody, files) => {
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
        bannerImages,
        galleryImages,
        dineInStatus,
        operatingDetails,
        tableManagement
    } = updateBody;

    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error(CONSTANTS.BUSINESS_NOT_FOUND);
    }

    // Upload banner and gallery images if provided
    const bannerFiles = files.bannerImages || [];
    const galleryFiles = files.galleryImages || [];
    const bannerImageUrls = await uploadBusinessImages(bannerFiles, "bannerImages", bannerImages);
    const galleryImageUrls = await uploadBusinessImages(galleryFiles, "galleryImages", galleryImages);

    // Update business fields
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
    business.bannerImages = bannerImageUrls || business.bannerImages;
    business.galleryImages = galleryImageUrls || business.galleryImages;
    business.dineInStatus = dineInStatus !== undefined ? dineInStatus : business.dineInStatus;
    business.operatingDetails = operatingDetails || business.operatingDetails;
    business.tableManagement = tableManagement || business.tableManagement;

    await business.save();
    return business;
};

// S3 Image Upload Logic
const uploadBusinessImages = async (files, folderName, existingImages = []) => {
    let imageUrls = [];
    if (files && files.length > 0) {
        const uploadResults = await awsS3Service.uploadDocuments(files, folderName);
        imageUrls = uploadResults.map((upload) => upload.location);
    }
    if (existingImages && existingImages.length > 0) { imageUrls = [...imageUrls, ...existingImages] }
    return imageUrls;
};

/**
 * Delete a business by ID
 * @param {ObjectId} businessId
 * @returns {Promise<void>}
 */
const deleteBusinessById = async (businessId) => {
    const business = await BusinessModel.findById(businessId);
    if (!business) { throw new Error(CONSTANTS.BUSINESS_NOT_FOUND) }
    const bannerImageKeys = business.bannerImages.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];
    });

    const galleryImageKeys = business.galleryImages.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];
    });

    if (bannerImageKeys.length > 0) { await awsS3Service.deleteFromS3(bannerImageKeys) }
    if (galleryImageKeys.length > 0) { await awsS3Service.deleteFromS3(galleryImageKeys) }
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

module.exports = {
    createBusinessForPartner,
    getBusinessById,
    getBusinessesForPartner,
    queryBusinesses,
    getBusinessesByType,
    updateBusinessById,
    uploadBusinessImages,
    deleteBusinessById,
    findBusinessesNearUser,
}