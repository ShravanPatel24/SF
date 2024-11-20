const { VariantsService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const CONSTANTS = require("../config/constant");

const createVariant = catchAsync(async (req, res) => {
    const data = await VariantsService.createVariant(req.body);
    res.status(201).json({ statusCode: CONSTANTS.SUCCESSFUL, data: data.data, message: data.message });
});

const getVariants = catchAsync(async (req, res) => {
    const data = await VariantsService.getVariants(req.query);
    res.status(200).json({
        statusCode: 200,
        message: 'Variants retrieved successfully.',
        data
    });
});

const getVariantsForPartner = catchAsync(async (req, res) => {
    const data = await VariantsService.getVariantsForPartner(req.query);
    res.status(200).json({
        statusCode: 200,
        message: 'Variants retrieved successfully for partner.',
        data
    });
});

const getVariantById = catchAsync(async (req, res) => {
    const data = await VariantsService.getVariantById(req.params.variantId);
    res.status(200).json({ statusCode: CONSTANTS.SUCCESSFUL, data, message: 'Variant details retrieved successfully.' });
});

const updateVariant = catchAsync(async (req, res) => {
    const data = await VariantsService.updateVariantById(req.params.variantId, req.body);
    res.status(200).json({ statusCode: CONSTANTS.SUCCESSFUL, data: data.data, message: data.message });
});

const deleteVariant = catchAsync(async (req, res) => {
    const data = await VariantsService.deleteVariantById(req.params.variantId);
    res.status(200).json({ statusCode: CONSTANTS.SUCCESSFUL, data: data.data, message: data.message });
});

module.exports = {
    createVariant,
    getVariants,
    getVariantsForPartner,
    getVariantById,
    updateVariant,
    deleteVariant
};