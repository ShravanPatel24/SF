const { ItemModel, BusinessModel } = require('../models');
const { s3Service } = require('../services');

// Create an item (Food, Room, or Product)
const createItem = async (itemData, files, partnerId) => {
    let imageUrls = [];
    let variants = [];

    try {
        if (files && files.length > 0) {
            const mainImages = files.filter(file => file.fieldname === 'images');
            const uploadResults = await s3Service.uploadDocuments(mainImages, 'item-images');
            imageUrls = uploadResults.map(upload => upload.key);
        }

        if (itemData.variants) {
            variants = Array.isArray(itemData.variants)
                ? itemData.variants
                : JSON.parse(itemData.variants);
        }
        const variantImages = files.filter(file => file.fieldname.startsWith('variants'));
        if (itemData.itemType === 'product') {
            for (let i = 0; i < variants.length; i++) {
                const variantField = `variants[${i}][variantImages]`;
                const variantFile = variantImages.find(file => file.fieldname === variantField);
                if (variantFile) {
                    const uploadResult = await s3Service.uploadDocuments([variantFile], 'variant-images');
                    variants[i].image = uploadResult[0].key;
                }
            }
        }
        const item = {
            business: itemData.businessId,
            businessType: itemData.businessTypeId,
            itemType: itemData.itemType,
            images: imageUrls,
            available: itemData.available || true,
            partner: partnerId,
            parentCategory: itemData.parentCategory,
            subCategory: itemData.subCategory,
            variants: itemData.itemType === 'product' ? variants : [],
        };

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
            if (itemData.checkIn) item.checkIn = new Date(itemData.checkIn);
            if (itemData.checkOut) item.checkOut = new Date(itemData.checkOut);
        } else if (itemData.itemType === 'product') {
            item.productName = itemData.productName;
            item.productDescription = itemData.productDescription;
            item.productDeliveryCharge = itemData.productDeliveryCharge;
            item.productFeatures = itemData.productFeatures;
        }
        const newItem = new ItemModel(item);
        await newItem.save();
        return newItem;

    } catch (error) {
        console.error("Error in createItem:", error.message);
        throw new Error("Failed to create item. Please check your data format.");
    }
};

// Get item by item ID
const getItemById = async (itemId) => {
    const item = await ItemModel.findById(itemId)
        .populate('parentCategory', 'tax')
        .populate('subCategory', 'tax');

    const taxRate = item.parentCategory ? item.parentCategory.tax : item.subCategory ? item.subCategory.tax : 0;

    return {
        ...item.toObject(),
        taxRate // Include the tax rate as set by the admin
    };
};

// Get items by business ID
const getItemsByBusiness = async (businessId, page = 1, limit = 10) => {
    const items = await ItemModel.find({ business: businessId })
        .populate('parentCategory', 'tax')
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

    const itemsWithTax = items.map(item => {
        const taxRate = item.parentCategory ? item.parentCategory.tax : 0;

        return {
            ...item.toObject(),
            taxRate // Directly return the tax rate set by the admin
        };
    });

    return itemsWithTax;
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

    // Fetch rooms, populating the room category to get the tax
    const rooms = await ItemModel.find({
        business: businessId,
        itemType: 'room'
    })
        .populate('roomCategory', 'categoryName tax') // Populate category name and tax
        .populate('business', 'businessName') // Populate business name
        .populate('businessType', 'name') // Populate business type name
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'room'
    });

    // Structure the response to include categorized rooms with tax rate
    const categorizedRooms = rooms.reduce((acc, room) => {
        const category = room.roomCategory ? room.roomCategory.categoryName : 'Uncategorized';
        const taxRate = room.roomCategory ? room.roomCategory.tax : 0;

        // Initialize category in the accumulator
        if (!acc[category]) {
            acc[category] = [];
        }

        // Add room details under the right category
        acc[category].push({
            _id: room._id,
            roomName: room.roomName,
            roomPrice: room.roomPrice,
            images: room.images,
            businessName: room.business ? room.business.businessName : 'Unknown',
            businessTypeName: room.businessType ? room.businessType.name : 'Unknown',
            taxRate // Include tax rate
        });

        return acc;
    }, {});

    return {
        docs: categorizedRooms,
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

    // Fetch food items with populated parent and subcategories, including tax
    const foods = await ItemModel.find({
        business: businessId,
        itemType: 'food'
    })
        .populate('parentCategory', 'categoryName tax') // Populate parent category name and tax
        .populate('subCategory', 'categoryName') // Populate subcategory name
        .populate('business', 'businessName') // Populate business name
        .populate('businessType', 'name') // Populate business type name
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'food'
    });

    // Structure the response to include categorized items and tax
    const categorizedItems = foods.reduce((acc, item) => {
        const parentCat = item.parentCategory ? item.parentCategory.categoryName : 'Uncategorized';
        const subCat = item.subCategory ? item.subCategory.categoryName : 'Uncategorized';
        const taxRate = item.parentCategory ? item.parentCategory.tax : 0;

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
            businessName: item.business ? item.business.businessName : 'Unknown',
            businessTypeName: item.businessType ? item.businessType.name : 'Unknown',
            taxRate // Include tax rate
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

    // Fetch product items with populated categories and tax
    const products = await ItemModel.find({
        business: businessId,
        itemType: 'product'
    })
        .populate('parentCategory', 'categoryName tax') // Populate parent category name and tax
        .populate('subCategory', 'categoryName') // Populate subcategory name
        .populate('business', 'businessName') // Populate business name
        .populate('businessType', 'name') // Populate business type name
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'product'
    });

    // Structure the response to include categorized items
    const categorizedItems = products.reduce((acc, item) => {
        const parentCat = item.parentCategory ? item.parentCategory.categoryName : 'Uncategorized';
        const subCat = item.subCategory ? item.subCategory.categoryName : 'Uncategorized';
        const taxRate = item.parentCategory ? item.parentCategory.tax : 0;

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
            productName: item.productName,
            productPrice: item.variants.length > 0 ? item.variants[0].productPrice : null, // Example for price handling
            images: item.images,
            businessName: item.business ? item.business.businessName : 'Unknown',
            businessTypeName: item.businessType ? item.businessType.name : 'Unknown',
            taxRate // Include tax rate
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

// Update an item by ID
const updateItemById = async (itemId, updateData, files) => {
    let imageUrls = [];
    if (files && files.images && files.images.length > 0) {
        const uploadResults = await s3Service.uploadDocuments(files.images, 'itemImages');
        imageUrls = uploadResults.map(upload => upload.key);
    }

    // Handle variant images update for products
    const variants = updateData.variants ? JSON.parse(updateData.variants) : [];
    if (updateData.itemType === 'product' && files && files.variantImages) {
        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            if (files.variantImages[i]) {
                const uploadResult = await s3Service.uploadDocuments(files.variantImages[i], 'variant-images');
                variant.image = uploadResult.key;
            }
        }
    }

    const item = await ItemModel.findById(itemId);
    if (!item) throw new Error('Item not found');
    const combinedImages = [...item.images, ...imageUrls];
    updateData.images = combinedImages;
    if (updateData.itemType === 'product') updateData.variants = variants;

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

    if (imageKeys.length > 0) { await s3Service.deleteFromS3(imageKeys) }
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