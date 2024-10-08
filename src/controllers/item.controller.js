const catchAsync = require('../utils/catchAsync');
const { ItemService } = require('../services');
const CONSTANTS = require("../config/constant");

// Create an item (Food, Room, or Product)
const createItem = catchAsync(async (req, res) => {
    try {
        const newItem = await ItemService.createItem(req.body, req.files);
        res.status(201).json({ message: CONSTANTS.ITEM_CREATED, newItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get item by item ID
const getItemById = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const item = await ItemService.getItemById(itemId);
    if (!item) {
        return res.status(404).json({ message: CONSTANTS.ITEM_NOT_FOUND });
    }
    res.status(200).json({ data: item });
});

// Get items by business
const getItemsByBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const result = await ItemService.getItemsByBusiness(businessId, page, limit);
        res.status(200).json({
            data: result,
            code: 200,
            message: 'Items retrieved successfully.'
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
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
            data: result,
            code: 200,
            message: 'Items retrieved successfully.'
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update an item
const updateItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    try {
        const updatedItem = await ItemService.updateItemById(itemId, req.body, req.files);
        res.status(200).json({ message: CONSTANTS.ITEM_UPDATED, updatedItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update operating details (Dine In Status, Operating Date & Hours, Table Management)
const updateOperatingDetails = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const { dineInStatus, operatingDetails, tableManagement } = req.body;
    try {
        let updateData = {
            dineInStatus: dineInStatus || false,
            operatingDetails: dineInStatus ? operatingDetails : [],
            tableManagement: dineInStatus ? tableManagement : []
        };
        const updatedItem = await ItemService.updateItemById(itemId, updateData);
        res.status(200).json({ message: CONSTANTS.OPERATING_DETAIL_UPDATED, updatedItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete an item
const deleteItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    try {
        await ItemService.deleteItemById(itemId);
        res.status(200).json({ message: CONSTANTS.DELETED });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = {
    createItem,
    getItemById,
    getItemsByBusiness,
    getItemsByBusinessType,
    updateItem,
    updateOperatingDetails,
    deleteItem,
};