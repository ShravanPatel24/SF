const { ItemModel, BusinessModel } = require('../models');
const { s3Service } = require('../services');

// Create an item (Food, Room, or Product)
const createItem = async (itemData, files, partnerId) => {
    let imageUrls = [];
    if (files && files.images && files.images.length > 0) {
        const uploadResults = await s3Service.uploadDocuments(files.images, 'item-images');
        imageUrls = uploadResults.map(upload => upload.key);
    }

    // Create the item object
    const item = {
        business: itemData.businessId,
        businessType: itemData.businessTypeId,
        itemType: itemData.itemType,
        images: imageUrls,
        available: itemData.available || true,
        partner: partnerId,
        parentCategory: itemData.parentCategory,
        subCategory: itemData.subCategory,
    };

    // Handle item-specific fields (food, room, product)
    if (itemData.itemType === 'food') {
        item.dishName = itemData.dishName;
        item.dishDescription = itemData.dishDescription;
        item.dishPrice = itemData.dishPrice;
        item.foodDeliveryCharge = itemData.foodDeliveryCharge;
    } else if (itemData.itemType === 'room') {
        item.roomName = itemData.roomName;
        item.roomDescription = itemData.roomDescription;
        item.roomPrice = itemData.roomPrice;
        item.roomCapacity = itemData.roomCapacity;
        item.roomCategory = itemData.roomCategory;
        item.roomTax = itemData.roomTax;
        item.amenities = itemData.amenities;

        if (itemData.checkIn) {
            item.checkIn = new Date(itemData.checkIn);
        }
        if (itemData.checkOut) {
            item.checkOut = new Date(itemData.checkOut);
        }
    } else if (itemData.itemType === 'product') {
        item.productName = itemData.productName;
        item.productDescription = itemData.productDescription;
        item.productDeliveryCharge = itemData.productDeliveryCharge;
        item.productFeatures = itemData.productFeatures;
        item.variants = itemData.variants;
    }

    const newItem = new ItemModel(item);
    await newItem.save();
    return newItem;
};

// Get item by item ID
const getItemById = async (itemId) => {
    const item = await ItemModel.findById(itemId)
        .populate('roomCategory') // Populate roomCategory for room items
        .populate('parentCategory') // Populate parentCategory
        .populate('subCategory') // Populate subCategory for food and product items
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

// Get all rooms by business ID
const getRoomsByBusiness = async (businessId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Check if the businessId is valid
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error('Invalid business ID');
    }
    const rooms = await ItemModel.find({
        business: businessId,
        itemType: 'room'
    })
        .skip(skip)
        .limit(limit)
        .exec();
    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'room'
    });
    return {
        docs: rooms,
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

// Get all rooms by business ID
const getFoodByBusiness = async (businessId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    // Check if the businessId is valid
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error('Invalid business ID');
    }

    // Fetch food items with populated parent and subcategories, business, and businessType
    const foods = await ItemModel.find({
        business: businessId,
        itemType: 'food'
    })
    .populate('parentCategory', 'categoryName') // Populate the parent category name
    .populate('subCategory', 'categoryName') // Populate the subcategory name
    .populate('business', 'businessName') // Populate the business name
    .populate('businessType', 'name') // Populate the business type name
    .skip(skip)
    .limit(limit)
    .exec();

    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'food'
    });

    // Structure the response to include categorized items
    const categorizedItems = foods.reduce((acc, item) => {
        const parentCat = item.parentCategory ? item.parentCategory.categoryName : 'Uncategorized';
        const subCat = item.subCategory ? item.subCategory.categoryName : 'Uncategorized';

        // Initialize categories in the accumulator
        if (!acc[parentCat]) {
            acc[parentCat] = {};
        }

        // Initialize subcategories
        if (!acc[parentCat][subCat]) {
            acc[parentCat][subCat] = [];
        }

        // Push item details into the right category and subcategory
        acc[parentCat][subCat].push({
            _id: item._id,
            dishName: item.dishName,
            dishPrice: item.dishPrice,
            images: item.images,
            businessName: item.business ? item.business.businessName : 'Unknown', // Add business name
            businessTypeName: item.businessType ? item.businessType.name : 'Unknown' // Add business type name
        });

        return acc;
    }, {});

    return {
        docs: categorizedItems,
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

// Get all rooms by business ID
const getProductByBusiness = async (businessId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    // Check if the businessId is valid
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error('Invalid business ID');
    }
    const rooms = await ItemModel.find({
        business: businessId,
        itemType: 'product'
    })
        .skip(skip)
        .limit(limit)
        .exec();
    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'product'
    });
    return {
        docs: rooms,
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
    let imageUrls = [];
    if (files && files.images && files.images.length > 0) {
        const uploadResults = await s3Service.uploadDocuments(files.images, 'itemImages');
        imageUrls = uploadResults.map(upload => upload.key);
    }
    const item = await ItemModel.findById(itemId);
    if (!item) { throw new Error('Item not found'); }
    const combinedImages = [...item.images, ...imageUrls];
    updateData.images = combinedImages;
    if (updateData.itemType === 'product') { updateData.productFeatures = updateData.productFeatures || []; }
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

// Guest Users

// Get all items (products, food, rooms)
const getAllItems = async () => {
    return await ItemModel.find({}); // Adjust criteria based on your requirements
};

// Search items by query
const searchItems = async (search) => {
    return await ItemModel.find({
        $or: [
            { productName: { $regex: search, $options: 'i' } },
            { dishName: { $regex: search, $options: 'i' } },
            { roomName: { $regex: search, $options: 'i' } },
        ]
    });
};

module.exports = {
    createItem,
    getItemById,
    getItemsByBusiness,
    getRoomsByBusiness,
    getFoodByBusiness,
    getProductByBusiness,
    getItemsByBusinessType,
    updateItemById,
    deleteItemById,
    getAllItems,
    searchItems
};