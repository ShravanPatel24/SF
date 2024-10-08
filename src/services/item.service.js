const { ItemModel } = require('../models');
const awsS3Service = require('../lib/aws_S3');

// Create an item (Food, Room, or Product)
const createItem = async (itemData, files) => {
    let imageUrls = [];

    // Handle image uploads for all item types
    if (files && files.images && files.images.length > 0) {
        const uploadResults = await awsS3Service.uploadDocuments(files.images, 'itemImages');
        imageUrls = uploadResults.map(upload => upload.location);
    } else if (itemData.images && itemData.images.length > 0) {
        imageUrls = itemData.images;
    }

    const item = {
        business: itemData.businessId,
        businessType: itemData.businessTypeId,
        itemType: itemData.itemType,
        images: imageUrls,
        available: itemData.available || true,
        category: itemData.category,
    };

    // Handle item-specific fields (food, room, product)
    if (itemData.itemType === 'food') {
        item.dishName = itemData.dishName;
        item.dishDescription = itemData.dishDescription;
        item.dishPrice = itemData.dishPrice;
        item.dineInStatus = itemData.dineInStatus || false;
        item.operatingDetails = item.dineInStatus ? itemData.operatingDetails : [];
        item.tableManagement = item.dineInStatus ? itemData.tableManagement : [];
    } else if (itemData.itemType === 'room') {
        item.roomName = itemData.roomName;
        item.roomDescription = itemData.roomDescription;
        item.roomPrice = itemData.roomPrice;
        item.roomType = itemData.roomType;
        item.roomTax = itemData.roomTax;
        item.checkIn = itemData.checkIn;
        item.checkOut = itemData.checkOut;
        item.amenities = itemData.amenities;
    } else if (itemData.itemType === 'product') {
        item.productName = itemData.productName;
        item.productDescription = itemData.productDescription;
        item.variants = itemData.variants;
    }

    const newItem = new ItemModel(item);
    await newItem.save();
    return newItem;
};

// Get item by item ID
const getItemById = async (itemId) => {
    const item = await ItemModel.findById(itemId);
    return item;
};

// Get items by business ID
const getItemsByBusiness = async (businessId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const items = await ItemModel.find({ business: businessId })
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({ business: businessId });

    return {
        docs: items,
        totalDocs,
        limit,
        totalPages: Math.ceil(totalDocs / limit),
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page * limit < totalDocs,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < totalDocs ? page + 1 : null,
    };
};

// Get items by businessType ID
const getItemsByBusinessType = async (businessTypeId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const items = await ItemModel.find({ businessType: businessTypeId })
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({ businessType: businessTypeId });

    return {
        docs: items,
        totalDocs,
        limit,
        totalPages: Math.ceil(totalDocs / limit),
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page * limit < totalDocs,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page * limit < totalDocs ? page + 1 : null,
    };
};

// Update an item by ID
const updateItemById = async (itemId, updateData, files) => {
    let imageUrls = updateData.images || [];
    if (files && files.images && files.images.length > 0) {
        const uploadResults = await awsS3Service.uploadDocuments(files.images, 'itemImages');
        imageUrls = uploadResults.map(upload => upload.location);
    }
    updateData.images = imageUrls;
    const updatedItem = await ItemModel.findByIdAndUpdate(itemId, updateData, { new: true });
    return updatedItem;
};

// Delete an item by ID
const deleteItemById = async (itemId) => {
    const item = await ItemModel.findById(itemId);
    if (!item) { throw new Error('Item not found') }
    const imageKeys = item.images.map(imageUrl => {
        const urlParts = imageUrl.split('/');
        return urlParts.slice(-2).join('/');
    });

    if (imageKeys.length > 0) { await awsS3Service.deleteFromS3(imageKeys) }
    await ItemModel.findByIdAndDelete(itemId);
};

module.exports = {
    createItem,
    getItemById,
    getItemsByBusiness,
    getItemsByBusinessType,
    updateItemById,
    deleteItemById,
};