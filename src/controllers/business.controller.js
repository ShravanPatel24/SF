const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const { BusinessService } = require("../services");
const CONSTANTS = require("../config/constant");

const createBusinessForPartner = catchAsync(async (req, res) => {
    try {
        const partnerId = req.user._id;
        const { businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings } = req.body;

        // Separate banner and gallery files
        const bannerFiles = req.files.bannerImages || [];
        const galleryFiles = req.files.galleryImages || [];

        // Upload the banner and gallery images
        const bannerImageUrls = await BusinessService.uploadBusinessImages(bannerFiles, "bannerImages");
        const galleryImageUrls = await BusinessService.uploadBusinessImages(galleryFiles, "galleryImages");

        const business = await BusinessService.createBusinessForPartner(partnerId, businessName, businessType, businessDescription, countryCode, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImageUrls, galleryImageUrls);

        res.status(CONSTANTS.SUCCESSFUL).json({ message: CONSTANTS.CREATED, business });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ message: error.message });
    }
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
    const result = await BusinessService.queryBusinesses(partnerId, options);
    res.send({ data: result, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIST });
});

const updateBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const { businessName, businessDescription, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages } = req.body;

    try {
        const updatedBusiness = await BusinessService.updateBusinessById(
            businessId,
            { businessName, businessDescription, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, bannerImages, galleryImages },
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
    if (!latitude || !longitude || !radiusInKm) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ message: "Latitude, longitude, and radius are required" });
    }
    try {
        const businesses = await BusinessService.findBusinessesNearUser(latitude, longitude, radiusInKm);
        res.status(CONSTANTS.SUCCESSFUL).json({ message: CONSTANTS.LIST, data: businesses });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ message: error.message });
    }
});

module.exports = {
    getBusinessesForPartner,
    updateBusiness,
    getBusinessById,
    deleteBusiness,
    createBusinessForPartner,
    getBusinessesNearUser,
};