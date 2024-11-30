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

// Get all rooms by business (hotel)
const getRoomsByBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortOrder = req.query.sortOrder || 'asc'; // Sort order (asc or desc)

    try {
        const result = await ItemService.getRoomsByBusiness(businessId, page, limit, sortOrder);
        res.status(200).json({
            statusCode: 200,
            data: result,
            message: 'Rooms retrieved successfully.',
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Get all rooms by business (hotel)
const getFoodByBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortOrder = req.query.sortOrder || 'desc';

    try {
        const result = await ItemService.getFoodByBusiness(businessId, page, limit, sortOrder);
        res.status(200).json({
            statusCode: 200,
            data: result,
            message: 'Menu retrieved successfully.',
        });
    } catch (error) {
        console.error('Error in getFoodByBusiness:', error);
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Get all rooms by business (hotel)
const getProductByBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortOrder = req.query.sortOrder || 'desc'; // Default to descending order

    try {
        const result = await ItemService.getProductByBusiness(businessId, page, limit, sortOrder);
        res.status(200).json({
            statusCode: 200,
            data: result,
            message: 'Products with variants retrieved successfully.',
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
        const { itemType, businessId } = req.query;

        // Validate itemType if provided
        const validItemTypes = ['product', 'food', 'room'];
        if (itemType && !validItemTypes.includes(itemType)) {
            return res.status(400).json({
                statusCode: 400,
                message: `Invalid itemType. Valid values are: ${validItemTypes.join(', ')}.`,
            });
        }

        // Validate businessId if provided
        if (businessId && !businessId.match(/^[0-9a-fA-F]{24}$/)) { // Validate MongoDB ObjectId format
            return res.status(400).json({
                statusCode: 400,
                message: `Invalid businessId. Must be a valid MongoDB ObjectId.`,
            });
        }

        // Call the service function with filters
        const items = await ItemService.getAllItems(itemType, businessId);

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

// Delete image from item
const deleteImageFromItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const { imageKey, variantId } = req.body; // Expect imageKey and optional variantId in request body

    if (!imageKey) {
        return res.status(400).json({
            statusCode: 400,
            message: 'Image key is required.',
        });
    }

    try {
        await ItemService.deleteImageFromItem(itemId, imageKey, variantId);
        res.status(200).json({
            statusCode: 200,
            message: 'Image deleted successfully.',
        });
    } catch (error) {
        console.error('Error in deleteImageFromItem:', error);
        res.status(400).json({
            statusCode: 400,
            message: error.message,
        });
    }
});

module.exports = {
    createItem,
    getItemById,
    getItemsByBusiness,
    getItemsByBusinessType,
    getRoomsByBusiness,
    getFoodByBusiness,
    getProductByBusiness,
    updateItem,
    deleteItem,
    getAllItems,
    searchItems,
    deleteImageFromItem
};