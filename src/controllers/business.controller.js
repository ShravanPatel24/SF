const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const { BusinessService } = require("../services");
const CONSTANTS = require("../config/constant");
const { s3Service } = require('../services');
const { BusinessTypeModel, BusinessModel } = require("../models");
const mongoose = require("mongoose");

const createBusinessForPartner = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays,
        openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, dineInStatus, operatingDetails, tableManagement
    } = req.body;

    const bannerFiles = req.files.bannerImages || [];
    const galleryFiles = req.files.galleryImages || [];

    // Upload images to S3
    const bannerImageUrls = await BusinessService.uploadBusinessImages(bannerFiles, "bannerImages");
    const galleryImageUrls = await BusinessService.uploadBusinessImages(galleryFiles, "galleryImages");

    // Pass data directly to the service
    const result = await BusinessService.createBusinessForPartner(
        partnerId, businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays,
        openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImageUrls, galleryImageUrls,
        dineInStatus, operatingDetails, tableManagement
    );

    if (result.statusCode !== 201) {
        return res.status(result.statusCode).json({
            statusCode: result.statusCode,
            message: result.message
        });
    }

    res.status(result.statusCode).json({
        statusCode: result.statusCode,
        message: CONSTANTS.CREATED,
        business: result.data
    });
});

const getBusinessById = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    try {
        const business = await BusinessService.getBusinessById(businessId);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.FETCHED, business });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getBusinessesForPartner = catchAsync(async (req, res) => {
    const { partnerId } = req.params;
    const options = pick(req.query, ["page", "limit", "sortBy", "status", "searchBy", "businessType"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    try {
        const result = await BusinessService.getBusinessesForPartner(partnerId, options, page, limit);

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            data: {
                docs: result.docs,
                pagination: {
                    totalDocs: result.totalDocs,
                    limit: result.limit,
                    totalPages: result.totalPages,
                    page: result.page,
                    pagingCounter: result.pagingCounter,
                    hasPrevPage: result.hasPrevPage,
                    hasNextPage: result.hasNextPage,
                    prevPage: result.prevPage,
                    nextPage: result.nextPage,
                },
            },
            message: CONSTANTS.LIST,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getBusinessesByType = catchAsync(async (req, res) => {
    if (!req.user || req.user.type !== 'user') {
        return res.status(CONSTANTS.UNAUTHORIZED).json({ statusCode: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PERMISSION_DENIED });
    }
    const { businessTypeId } = req.params;
    const options = pick(req.query, ["page", "limit", "searchBy", "sortBy"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const searchBy = options.searchBy || '';
    const sortBy = options.sortBy || 'createdAt';
    try {
        const result = await BusinessService.getBusinessesByType(businessTypeId, page, limit, searchBy, sortBy);
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            data: {
                docs: result.docs,
                pagination: {
                    totalDocs: result.totalDocs,
                    limit: result.limit,
                    totalPages: result.totalPages,
                    page: result.page,
                    pagingCounter: result.pagingCounter,
                    hasPrevPage: result.hasPrevPage,
                    hasNextPage: result.hasNextPage,
                    prevPage: result.prevPage,
                    nextPage: result.nextPage,
                },
            },
            message: CONSTANTS.LIST,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const updateBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const { businessName, businessDescription, mobile, countryCode, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus, operatingDetails, tableManagement } = req.body;
    try {
        const updatedBusiness = await BusinessService.updateBusinessById(
            businessId,
            { businessName, businessDescription, mobile, countryCode, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus, operatingDetails, tableManagement },
            req.files
        );
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.UPDATED, business: updatedBusiness });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const deleteBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    try {
        await BusinessService.deleteBusinessById(businessId);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.DELETED });
    } catch (error) {
        res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: error.message });
    }
});

const deleteBusinessImages = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const { imageUrl, imageType } = req.body; // imageType: 'banner' or 'gallery'

    try {
        const business = await BusinessService.getBusinessById(businessId);
        if (!business) {
            return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.BUSINESS_NOT_FOUND });
        }

        let updatedImages = [];
        if (imageType === 'banner') {
            // Remove the image from bannerImages
            updatedImages = business.bannerImages.filter((url) => url !== imageUrl);
            business.bannerImages = updatedImages;
        } else if (imageType === 'gallery') {
            // Remove the image from galleryImages
            updatedImages = business.galleryImages.filter((url) => url !== imageUrl);
            business.galleryImages = updatedImages;
        } else {
            return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: 'Invalid image type' });
        }

        // Delete the image from S3
        const imageKey = imageUrl.split('/').pop(); // Extract key from URL
        await s3Service.deleteFromS3([imageKey]);

        // Save updated business
        await business.save();

        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: 'Image deleted successfully', business });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getBusinessesNearUser = catchAsync(async (req, res) => {
    const { latitude, longitude, radiusInKm, businessTypeId, search } = req.query;
    const options = pick(req.query, ["page", "limit"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;

    if (!latitude || !longitude || !radiusInKm) {
        return res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: "Latitude, longitude, and radius are required",
        });
    }

    try {
        const result = await BusinessService.findBusinessesNearUser(latitude, longitude, radiusInKm, page, limit, businessTypeId, search);
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            data: {
                docs: result.docs,
                totalDocs: result.totalDocs,
                limit: result.limit,
                totalPages: result.totalPages,
                page: result.page,
                pagingCounter: result.pagingCounter,
                hasPrevPage: result.hasPrevPage,
                hasNextPage: result.hasNextPage,
                prevPage: result.prevPage,
                nextPage: result.nextPage,
            },
            message: CONSTANTS.LIST,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getHotelsNearUser = catchAsync(async (req, res) => {
    const { latitude, longitude, radiusInKm, checkIn, checkOut, guests, roomQuantity } = req.query;
    const options = pick(req.query, ["page", "limit"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;

    if (!latitude || !longitude || !radiusInKm) {
        return res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: "Latitude, longitude, and radius are required"
        });
    }

    try {
        const result = await BusinessService.findNearbyHotelsWithRooms(
            latitude, longitude, radiusInKm, checkIn, checkOut, guests, parseInt(roomQuantity, 10), page, limit
        );
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            data: {
                docs: result.docs,
                totalDocs: result.totalDocs,
                limit: result.limit,
                totalPages: result.totalPages,
                page: result.page,
                pagingCounter: result.pagingCounter,
                hasPrevPage: result.hasPrevPage,
                hasNextPage: result.hasNextPage,
                prevPage: result.prevPage,
                nextPage: result.nextPage
            },
            message: CONSTANTS.LIST
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getDashboardCounts = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    try {
        const counts = await BusinessService.getDashboardCountsForPartner(partnerId);
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: 'Dashboard counts fetched successfully.',
            data: counts,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getOrderListByType = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { type, sort } = req.query;

    try {
        const orders = await BusinessService.getOrderListByType(partnerId, type, sort);

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: `List for ${type} fetched successfully.`,
            data: orders,
        });
    } catch (error) {
        const errorMessage = error.message === "Invalid type for order list retrieval."
            ? "Invalid type provided. Please provide a valid order list type."
            : error.message;

        res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: errorMessage
        });
    }
});

// Get all businesses for guests
const getAllBusinesses = catchAsync(async (req, res) => {
    try {
        let { businessType, businessTypeId } = req.query;
        let condition = {};

        // If businessTypeId (ObjectId) is provided
        if (businessTypeId) {
            // Check if businessTypeId is a valid ObjectId
            if (!mongoose.Types.ObjectId.isValid(businessTypeId)) {
                return res.status(CONSTANTS.BAD_REQUEST).json({
                    statusCode: CONSTANTS.BAD_REQUEST,
                    message: "Invalid businessTypeId format.",
                });
            }
            // Convert to ObjectId and add to condition
            condition.businessType = new mongoose.Types.ObjectId(businessTypeId);
        }

        // If businessType (name) is provided
        if (businessType) {
            // Look up businessType by name to get the ObjectId
            const businessTypeRecord = await BusinessTypeModel.findOne({ name: businessType });
            if (businessTypeRecord) {
                condition.businessType = businessTypeRecord._id;
            } else {
                return res.status(CONSTANTS.NOT_FOUND).json({
                    statusCode: CONSTANTS.NOT_FOUND,
                    message: `Business type "${businessType}" not found.`,
                });
            }
        }

        // Fetch businesses based on the condition (either businessTypeId or businessType name)
        const businesses = await BusinessModel.find(condition);
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.LIST,
            data: businesses,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: error.message,
        });
    }
});

const getBusinessByIdForGuest = catchAsync(async (req, res) => {
    const { businessId } = req.params;

    try {
        // Validate businessId
        if (!mongoose.Types.ObjectId.isValid(businessId)) {
            return res.status(CONSTANTS.BAD_REQUEST).json({
                statusCode: CONSTANTS.BAD_REQUEST,
                message: "Invalid businessId format.",
            });
        }

        // Fetch the business details
        const business = await BusinessService.getBusinessById(businessId);

        // If no business is found
        if (!business) {
            return res.status(CONSTANTS.NOT_FOUND).json({
                statusCode: CONSTANTS.NOT_FOUND,
                message: CONSTANTS.BUSINESS_NOT_FOUND,
            });
        }

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.FETCHED,
            data: business,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: error.message,
        });
    }
});

module.exports = {
    getBusinessesForPartner,
    updateBusiness,
    getBusinessById,
    getBusinessesByType,
    deleteBusiness,
    deleteBusinessImages,
    createBusinessForPartner,
    getBusinessesNearUser,
    getHotelsNearUser,
    getDashboardCounts,
    getOrderListByType,
    getAllBusinesses,
    getBusinessByIdForGuest
};