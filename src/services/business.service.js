const { BusinessModel, UserModel, BusinessTypeModel } = require("../models");
const CONSTANTS = require("../config/constant");
const awsS3Service = require("../lib/aws_S3");

const createBusinessForPartner = async (partnerId, businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages
) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG); }
    if (partner.name === businessName) { throw new Error(CONSTANTS.BUSINESS_AND_PARTNER_NAME_DUPLICATION); }

    const validBusinessType = await BusinessTypeModel.findById(businessType);
    if (!validBusinessType) { throw new Error(CONSTANTS.INVALID_BUSINESS_TYPE); }

    const business = new BusinessModel({
        businessName, partner: partnerId, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages
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

const queryBusinesses = async (partnerId, options) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG) }
    const { page = 1, limit = 10, sortBy, searchBy, businessType } = options;
    let query = { partner: partnerId };

    if (businessType) { query.businessType = businessType }
    if (searchBy) { query.businessName = { $regex: searchBy, $options: "i" } }

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

    await business.save();
    return business;
};

// S3 Image Upload Logic
const uploadBusinessImages = async (files, folderName, existingImages = []) => {
    let imageUrls = [];
    if (files && files.length > 0) {
        const uploadResults = await awsS3Service.uploadDocuments(files, folderName);
        imageUrls = uploadResults.map((upload) => upload.location);

        // Log the uploaded image URLs for debugging
        console.log(`Uploaded ${folderName} Image URLs:`, imageUrls);
    }

    if (existingImages && existingImages.length > 0) {
        imageUrls = [...imageUrls, ...existingImages];
    }

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

const findBusinessesNearUser = async (userLatitude, userLongitude, radiusInKm) => {
    const businesses = await BusinessModel.find({
        "businessAddress.location": {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [userLongitude, userLatitude],
                },
                $maxDistance: radiusInKm * 1000,
            },
        },
    });
    return businesses;
};

module.exports = {
    createBusinessForPartner,
    getBusinessById,
    getBusinessesForPartner,
    queryBusinesses,
    updateBusinessById,
    uploadBusinessImages,
    deleteBusinessById,
    findBusinessesNearUser,
}