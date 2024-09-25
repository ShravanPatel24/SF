const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const { BusinessDetailService } = require("../services");
const CONSTANT = require("../config/constant");
const awsS3Service = require("../lib/aws_S3");

const createBusinessForPartner = catchAsync(async (req, res) => {
    try {
        const { partnerId, businessName, businessType, details } = req.body;
        let imageUrls = [];

        // Handle file uploads (if files are uploaded)
        if (req.files && req.files.length > 0) {
            // Upload multiple images to S3
            const uploadResults = await awsS3Service.uploadDocuments(
                req.files,
                "businessImages"
            );
            imageUrls = uploadResults.map((upload) => upload.location); // Get all S3 URLs for the uploaded images
        } else if (req.body.images && req.body.images.length > 0) {
            // If image URLs are provided in the request body, use them
            imageUrls = req.body.images;
        }

        // Create the business with images (either URLs from body or uploaded URLs)
        const business = await BusinessDetailService.createBusinessForPartner(
            partnerId,
            businessName,
            businessType,
            details,
            imageUrls
        );

        res
            .status(201)
            .json({ message: "Business created successfully", business });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

const getBusinessesForPartner = catchAsync(async (req, res) => {
    const options = pick(req.query, [
        "page",
        "limit",
        "sortBy",
        "status",
        "searchBy",
        "businessType",
    ]);
    const result = await BusinessDetailService.queryBusinesses(options);
    res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LIST });
});

const updateBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const { businessName, businessType, details, images } = req.body;
    try {
        const updatedBusiness = await BusinessDetailService.updateBusinessById(
            businessId,
            { businessName, businessType, details, images },
            req.files
        );
        res.status(200).json({
            code: 200,
            message: "Business updated successfully",
            business: updatedBusiness,
        });
    } catch (error) {
        res.status(400).json({ code: 400, message: error.message });
    }
});

const deleteBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    try {
        await BusinessDetailService.deleteBusinessById(businessId);
        res
            .status(200)
            .json({ code: 200, message: "Business deleted successfully" });
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
