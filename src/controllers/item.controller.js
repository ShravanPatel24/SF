const catchAsync = require('../utils/catchAsync');
const { ItemService } = require('../services');
const awsS3Service = require('../lib/aws_S3');
const CONSTANTS = require("../config/constant");

// Create an item (Food, Room, or Product)
const createItem = catchAsync(async (req, res) => {
    try {
        const { businessId, businessTypeId, itemType, name, description, price, category, dineInStatus, operatingDetails, tableManagement } = req.body;
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadResults = await awsS3Service.uploadDocuments(req.files, 'itemImages');
            imageUrls = uploadResults.map((upload) => upload.location);
        } else if (req.body.images && req.body.images.length > 0) {
            imageUrls = req.body.images;
        }
        let itemData = {
            business: businessId,
            businessType: businessTypeId,
            itemType,
            category,
            images: imageUrls,
            available: req.body.available || true
        };
        // Map fields based on itemType
        if (itemType === 'food') {
            itemData.dishName = name || req.body.dishName;
            itemData.dishDescription = description || req.body.dishDescription;
            itemData.dishPrice = price || req.body.dishPrice;
            itemData.dineInStatus = dineInStatus || false;
            itemData.operatingDetails = dineInStatus ? operatingDetails : [];
            itemData.tableManagement = dineInStatus ? tableManagement : [];
        } else if (itemType === 'room') {
            itemData.roomName = req.body.roomName || name;
            itemData.roomDescription = req.body.roomDescription || description;
            itemData.roomPrice = req.body.roomPrice || price;
            itemData.roomType = req.body.roomType;
            itemData.roomTax = req.body.roomTax;
            itemData.checkIn = req.body.checkIn;
            itemData.checkOut = req.body.checkOut;
            itemData.amenities = req.body.amenities;
        } else if (itemType === 'product') {
            itemData.productName = req.body.productName || name;
            itemData.productDescription = req.body.productDescription || description;
            itemData.productPrice = req.body.productPrice || price;
            itemData.size = req.body.size;
            itemData.color = req.body.color;
            itemData.nonReturnable = req.body.nonReturnable || false;
        }
        const newItem = await ItemService.createItem(itemData);
        res.status(201).json({ message: CONSTANTS.ITEM_CREATED, newItem });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get item by item ID
const getItemById = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const item = await ItemService.getItemById(itemId);
    if (!item) { return res.status(404).json({ message: CONSTANTS.ITEM_NOT_FOUND }) }
    res.status(200).json({ data: item });
});

// Get items by business
const getItemsByBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const result = await ItemService.getItemsByBusiness(businessId);
    res.status(200).json({ data: result });
});

// Get items by businessType
const getItemsByBusinessType = catchAsync(async (req, res) => {
    const { businessTypeId } = req.params;
    const result = await ItemService.getItemsByBusinessType(businessTypeId);
    res.status(200).json({ data: result });
});

// Update an item
const updateItem = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const updateData = req.body;

    try {
        let imageUrls = updateData.images || [];

        // Handle image updates
        if (req.files && req.files.length > 0) {
            const uploadResults = await awsS3Service.uploadDocuments(req.files, 'itemImages');
            imageUrls = uploadResults.map((upload) => upload.location);
        }

        updateData.images = imageUrls;

        const updatedItem = await ItemService.updateItemById(itemId, updateData);
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
        let updateData = {};

        updateData.dineInStatus = dineInStatus || false;
        updateData.operatingDetails = operatingDetails || [];
        updateData.tableManagement = tableManagement || [];

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