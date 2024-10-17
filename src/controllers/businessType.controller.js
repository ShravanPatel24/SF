const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { BusinessTypeService } = require('../services');
const CONSTANT = require('../config/constant');

// Create a new business type
const create = catchAsync(async (req, res) => {
    const data = await BusinessTypeService.create(req.body);
    res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CREATED, data });
});

// Get business type list with pagination
const getLists = catchAsync(async (req, res) => {
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'searchBy', 'status', 'filterDateRange']);
    const result = await BusinessTypeService.queries(options);
    res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.LIST, data: result });
});

// Get business type by ID
const getById = catchAsync(async (req, res) => {
    const data = await BusinessTypeService.getById(req.params.id);
    if (!data) {
        return res.status(CONSTANT.NOT_FOUND).json({ statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.BUSINESS_TYPE_NOT_FOUND_MSG, data: {} });
    }
    res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DETAILS, data });
});

// Update a business type by ID
const updateById = catchAsync(async (req, res) => {
    const data = await BusinessTypeService.updateById(req.params.id, req.body);
    if (data.statusCode !== CONSTANT.SUCCESSFUL) { return res.status(data.statusCode).json({ statusCode: data.statusCode, message: data.message, data: data.data }) }
    res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.UPDATED, data: data.data });
});

// Delete a business type by ID
const deleteById = catchAsync(async (req, res) => {
    const result = await BusinessTypeService.deleteById(req.params.id);
    if (result.statusCode !== CONSTANT.SUCCESSFUL) {
        return res.status(result.statusCode).json({ statusCode: result.statusCode, message: result.message, data: result.data });
    }
    return res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED, data: result.data });
});

// Get business types without pagination
const getListWithoutPagination = catchAsync(async (req, res) => {
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'searchBy', 'status']);
    const result = await BusinessTypeService.getListWithoutPagination(options);
    res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.LIST, data: result });
});

module.exports = {
    create,
    getLists,
    getById,
    updateById,
    deleteById,
    getListWithoutPagination
};