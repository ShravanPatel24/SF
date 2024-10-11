const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const { BusinessService } = require("../services");
const CONSTANTS = require("../config/constant");

const createBusinessForPartner = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const { businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, dineInStatus, operatingDetails, tableManagement } = req.body;

    const bannerFiles = req.files.bannerImages || [];
    const galleryFiles = req.files.galleryImages || [];

    const bannerImageUrls = await BusinessService.uploadBusinessImages(bannerFiles, "bannerImages");
    const galleryImageUrls = await BusinessService.uploadBusinessImages(galleryFiles, "galleryImages");

    const business = await BusinessService.createBusinessForPartner(
        partnerId, businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, 
        openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImageUrls, galleryImageUrls, 
        dineInStatus, operatingDetails, tableManagement
    );

    res.status(CONSTANTS.SUCCESSFUL).json({ message: CONSTANTS.CREATED, business });
});

const getBusinessById = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    try {
        const business = await BusinessService.getBusinessById(businessId);
        res.status(CONSTANTS.SUCCESSFUL).json({ message: CONSTANTS.FETCHED, business });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ message: error.message });
    }
});

const getBusinessesForPartner = catchAsync(async (req, res) => {
    const { partnerId } = req.params;
    const options = pick(req.query, ["page", "limit", "sortBy", "status", "searchBy", "businessType"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;

    try {
        const result = await BusinessService.queryBusinesses(partnerId, options, page, limit);

        res.status(CONSTANTS.SUCCESSFUL).json({
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
            code: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.LIST,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ code: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const getBusinessesByType = catchAsync(async (req, res) => {
    // Check if user is authenticated and is a partner
    if (!req.user || req.user.type !== 'user') { return res.status(CONSTANTS.UNAUTHORIZED).json({ code: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PERMISSION_DENIED }) }

    const { businessTypeId } = req.params;
    const options = pick(req.query, ["page", "limit", "searchBy", "sortBy"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const searchBy = options.searchBy || '';
    const sortBy = options.sortBy || 'createdAt';
    try {
        const result = await BusinessService.getBusinessesByType(businessTypeId, page, limit, searchBy, sortBy);
        res.status(CONSTANTS.SUCCESSFUL).json({
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
            code: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.LIST,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ code: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const updateBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const { businessName, businessDescription, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus, operatingDetails, tableManagement } = req.body;

    try {
        const updatedBusiness = await BusinessService.updateBusinessById(
            businessId,
            { businessName, businessDescription, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages, dineInStatus, operatingDetails, tableManagement },
            req.files
        );
        res.status(CONSTANTS.SUCCESSFUL).json({ code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.UPDATED, business: updatedBusiness });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ code: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

const deleteBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    try {
        await BusinessService.deleteBusinessById(businessId);
        res.status(CONSTANTS.SUCCESSFUL).json({ code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.DELETED });
    } catch (error) {
        res.status(CONSTANTS.NOT_FOUND).json({ code: CONSTANTS.NOT_FOUND, message: error.message });
    }
});

const getBusinessesNearUser = catchAsync(async (req, res) => {
    const { latitude, longitude, radiusInKm } = req.query;
    const options = pick(req.query, ["page", "limit"]);
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    if (!latitude || !longitude || !radiusInKm) { return res.status(CONSTANTS.BAD_REQUEST).json({ message: "Latitude, longitude, and radius are required" }) }
    try {
        const result = await BusinessService.findBusinessesNearUser(latitude, longitude, radiusInKm, page, limit);
        res.status(CONSTANTS.SUCCESSFUL).json({
            data: {
                docs: result.docs, // List of businesses
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
            code: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.LIST,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ message: error.message });
    }
});

module.exports = {
    getBusinessesForPartner,
    updateBusiness,
    getBusinessById,
    getBusinessesByType,
    deleteBusiness,
    createBusinessForPartner,
    getBusinessesNearUser,
};