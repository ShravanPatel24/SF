const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const { BusinessService } = require("../services");
const CONSTANT = require("../config/constant");
const awsS3Service = require("../lib/aws_S3");

const createBusinessForPartner = catchAsync(async (req, res) => {
    try {
        const partnerId = req.user._id;
        const { businessName, businessType, businessDescription, mobile, email, businessAddress, openingDays, sameTimeForAllDays, uniformTiming, daywiseTimings } = req.body;
        let imageUrls = [];

        if (req.files && req.files.length > 0) {
            const uploadResults = await awsS3Service.uploadDocuments(req.files, "businessImages");
            imageUrls = uploadResults.map((upload) => upload.location);
        } else if (req.body.images && req.body.images.length > 0) { imageUrls = req.body.images }
        const business = await BusinessService.createBusinessForPartner(
            partnerId,
            businessName,
            businessType,
            businessDescription,
            mobile,
            email,
            businessAddress,
            openingDays,
            sameTimeForAllDays,
            uniformTiming,
            daywiseTimings,
            imageUrls
        );
        res.status(201).json({ message: "Business created successfully", business });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

const getBusinessesForPartner = catchAsync(async (req, res) => {
    const { partnerId } = req.params;
    const options = pick(req.query, ["page", "limit", "sortBy", "status", "searchBy", "businessType"]);
    const result = await BusinessService.queryBusinesses(partnerId, options);
    res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LIST });
});

const updateBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const { businessName, businessDescription, mobile, email, businessAddress, openingDays, sameTimeForAllDays, uniformTiming, daywiseTimings, images } = req.body; try {
        const updatedBusiness = await BusinessService.updateBusinessById(
            businessId,
            { businessName, businessDescription, mobile, email, businessAddress, openingDays, sameTimeForAllDays, uniformTiming, daywiseTimings, images },
            req.files
        );
        res.status(200).json({ code: 200, message: "Business updated successfully", business: updatedBusiness });
    } catch (error) { res.status(400).json({ code: 400, message: error.message }) }
});

const deleteBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    try {
        await BusinessService.deleteBusinessById(businessId);
        res.status(200).json({ code: 200, message: "Business deleted successfully" });
    } catch (error) {
        res.status(404).json({ code: 404, message: error.message });
    }
});

module.exports = {
    getBusinessesForPartner,
    updateBusiness,
    deleteBusiness,
    createBusinessForPartner,
};
