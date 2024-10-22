const catchAsync = require('../utils/catchAsync');
const { ItemService } = require('../services');
const CONSTANTS = require("../config/constant");

// Create an item (Food, Room, or Product)
const createItem = catchAsync(async (req, res) => {
    try {
        const partnerId = req.user._id;
        const newItem = await ItemService.createItem(req.body, req.files, partnerId);
        res.status(201).json({ statusCode: 201, message: CONSTANTS.ITEM_CREATED, data: newItem });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Get item by item ID
const getItemById = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const item = await ItemService.getItemById(itemId);
    if (!item) {
        return res.status(404).json({ statusCode: 404, message: CONSTANTS.ITEM_NOT_FOUND });
    }
    res.status(200).json({ statusCode: 200, data: item });
});

// Get items by business
const getItemsByBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const result = await ItemService.getItemsByBusiness(businessId, page, limit);
        res.status(200).json({
            statusCode: 200,
            data: result,
            message: 'Items retrieved successfully.',
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Get items by businessType
const getItemsByBusinessType = catchAsync(async (req, res) => {
    const { businessTypeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const result = await ItemService.getItemsByBusinessType(businessTypeId, page, limit);
        res.status(200).json({
            statusCode: 200,
            data: result,
            message: 'Items retrieved successfully.',
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Update an item
const updateItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    try {
        const updatedItem = await ItemService.updateItemById(itemId, req.body, req.files);
        res.status(200).json({ statusCode: 200, message: CONSTANTS.ITEM_UPDATED, data: updatedItem });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Delete an item
const deleteItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    try {
        await ItemService.deleteItemById(itemId);
        res.status(200).json({ statusCode: 200, message: CONSTANTS.DELETED });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Guest Users

// Get all items (products, food, rooms) for guest users
const getAllItems = catchAsync(async (req, res) => {
    try {
        const items = await ItemService.getAllItems(); // Implement this in your service
        res.status(200).json({ statusCode: 200, data: items });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Search items for guest users
const searchItems = catchAsync(async (req, res) => {
    const searchQuery = req.query.search;
    if (!searchQuery || typeof searchQuery !== 'string') { return res.status(400).json({ statusCode: 400, message: "Search query must be a valid string." }) }
    try {
        const items = await ItemService.searchItems(searchQuery);
        res.status(200).json({ statusCode: 200, data: items });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

module.exports = {
    createItem,
    getItemById,
    getItemsByBusiness,
    getItemsByBusinessType,
    updateItem,
    deleteItem,
    getAllItems,
    searchItems,
};