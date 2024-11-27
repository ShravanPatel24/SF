const { ItemModel, BusinessModel } = require('../models');
const { s3Service } = require('../services');

// Create an item (Food, Room, or Product)
const createItem = async (itemData, files, partnerId) => {
    let imageUrls = [];
    let variantsWithImages = [];

    try {
        // Handle image uploads for the main item
        if (files && files.length > 0) {
            const mainImages = files.filter(file => file.fieldname === 'images');
            const uploadResults = await s3Service.uploadDocuments(mainImages, 'item-images');
            imageUrls = uploadResults.map(upload => upload.key);
        }

        // Build base item object
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

        // Handle room-specific fields
        if (itemData.itemType === 'room') {
            item.roomName = itemData.roomName;
            item.roomDescription = itemData.roomDescription;
            item.roomPrice = itemData.roomPrice;
            item.roomCapacity = itemData.roomCapacity;
            item.roomCategory = itemData.roomCategory;
            item.checkIn = new Date(itemData.checkIn);
            item.checkOut = new Date(itemData.checkOut);
            item.amenities = Array.isArray(itemData.amenities) ? itemData.amenities : [];
        }

        // Handle product-specific fields, including variants with images
        if (itemData.itemType === 'product') {
            item.productName = itemData.productName;
            item.productDescription = itemData.productDescription;
            item.productDeliveryCharge = itemData.productDeliveryCharge;
            item.productFeatures = itemData.productFeatures;
            item.nonReturnable = itemData.nonReturnable || false;

            // Parse and validate variants
            if (itemData.variants) {
                const variants = Array.isArray(itemData.variants)
                    ? itemData.variants
                    : JSON.parse(itemData.variants);

                // Handle images for each variant
                const variantImages = files.filter(file => file.fieldname.startsWith('variants'));
                for (let i = 0; i < variants.length; i++) {
                    const variantField = `variants[${i}][variantImages]`;
                    const variantFile = variantImages.find(file =>
                        file.fieldname === variantField || file.fieldname === `variants[${i}][variantImage]`
                    );

                    // Upload variant image if available
                    if (variantFile) {
                        const uploadResult = await s3Service.uploadDocuments([variantFile], 'variant-images');
                        variants[i].image = uploadResult[0].key; // Assign uploaded image to variant
                    }
                }

                // Map variants with their details
                variantsWithImages = variants.map(variant => ({
                    variantId: variant.variantId,
                    productPrice: variant.productPrice,
                    image: variant.image || null,
                }));
            }

            item.variants = variantsWithImages;
        }

        // Handle food-specific fields
        if (itemData.itemType === 'food') {
            item.dishName = itemData.dishName;
            item.dishDescription = itemData.dishDescription;
            item.dishPrice = itemData.dishPrice;
            item.foodDeliveryCharge = itemData.foodDeliveryCharge;
            item.ingredients = Array.isArray(itemData.ingredients) ? itemData.ingredients : JSON.parse(itemData.ingredients || '[]');
            item.spicyLevel = itemData.spicyLevel || 'medium'; // Optional, default is 'medium'
        }

        // Save item to database
        const newItem = new ItemModel(item);
        await newItem.save();
        return newItem;

    } catch (error) {
        console.error("Error in createItem:", error.message);

        // Return detailed error for validation issues
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        // Generic fallback error
        throw new Error("Failed to create item. Please check your data format.");
    }
};

// Get item by item ID
const getItemById = async (itemId) => {
    const item = await ItemModel.findById(itemId)
        .populate('parentCategory', 'tax categoryName')
        .populate('subCategory', 'tax categoryName')
        .populate('variants.variantId', 'variantName size color'); // Populate variant details

    if (!item) {
        throw new Error('Item not found');
    }

    const taxRate = item.parentCategory ? item.parentCategory.tax : item.subCategory ? item.subCategory.tax : 0;

    // Map variants if the item is a product
    const variants = item.itemType === 'product'
        ? item.variants.map(variant => ({
            variantId: variant.variantId?._id,
            variantName: variant.variantId?.variantName || null,
            size: variant.variantId?.size || null,
            color: variant.variantId?.color || null,
            productPrice: variant.productPrice,
            image: variant.image || null,
        }))
        : undefined;

    return {
        ...item.toObject(),
        taxRate, // Include the tax rate as set by the admin
        variants, // Include mapped variants for product items
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
const getRoomsByBusiness = async (businessId, page = 1, limit = 10, sortOrder = 'asc') => {
    const skip = (page - 1) * limit;

    // Check if the businessId is valid
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error('Invalid business ID');
    }

    // Determine sort order
    const sort = { createdAt: sortOrder === 'desc' ? -1 : 1 };

    // Fetch rooms with sorting and populating related fields
    const rooms = await ItemModel.find({
        business: businessId,
        itemType: 'room'
    })
        .populate('roomCategory', 'categoryName tax') // Populate category name and tax
        .populate('business', 'businessName') // Populate business name
        .populate('businessType', 'name') // Populate business type name
        .sort(sort) // Sort by addition status (createdAt)
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'room'
    });

    // Structure the response
    return {
        docs: rooms.map(room => ({
            _id: room._id,
            roomName: room.roomName,
            roomPrice: room.roomPrice,
            images: room.images,
            businessName: room.business ? room.business.businessName : 'Unknown',
            businessTypeName: room.businessType ? room.businessType.name : 'Unknown',
            taxRate: room.roomCategory ? room.roomCategory.tax : 0,
            createdAt: room.createdAt // Include creation time
        })),
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
const getFoodByBusiness = async (businessId, page = 1, limit = 10, sortOrder = 'desc') => {
    const skip = (page - 1) * limit;

    // Fetch business details
    const business = await BusinessModel.findById(businessId).select(
        'businessName businessDescription businessAddress mobile email'
    );
    if (!business) {
        throw new Error('Invalid business ID');
    }

    // Format the address
    const address = business.businessAddress
        ? `${business.businessAddress.street}, ${business.businessAddress.city}, ${business.businessAddress.state}, ${business.businessAddress.country}, ${business.businessAddress.postalCode}`
        : 'No address available';

    // Determine sort order
    const sort = { createdAt: sortOrder === 'desc' ? -1 : 1 };

    // Fetch food items
    const foods = await ItemModel.find({
        business: businessId,
        itemType: 'food',
    })
        .populate('parentCategory', '_id categoryName') // Include _id in parentCategory
        .populate('subCategory', 'categoryName')
        .select('dishName dishDescription dishPrice foodDeliveryCharge available images createdAt parentCategory subCategory')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();

    const totalDocs = await ItemModel.countDocuments({
        business: businessId,
        itemType: 'food',
    });

    // Group items by parent category and subcategory
    const groupedData = foods.reduce((result, item) => {
        const parentCategoryName = item.parentCategory?.categoryName || 'Uncategorized';
        const parentCategoryId = item.parentCategory?._id || null;
        const subCategoryName = item.subCategory?.categoryName || 'Uncategorized';

        if (!result[parentCategoryName]) {
            result[parentCategoryName] = {
                _id: parentCategoryId, // Include parent category ID
                subCategories: [],
            };
        }

        let subCategory = result[parentCategoryName].subCategories.find(sub => sub[subCategoryName]);
        if (!subCategory) {
            subCategory = { [subCategoryName]: [] };
            result[parentCategoryName].subCategories.push(subCategory);
        }

        subCategory[subCategoryName].push({
            _id: item._id,
            dishName: item.dishName,
            dishDescription: item.dishDescription,
            dishPrice: item.dishPrice,
            foodDeliveryCharge: item.foodDeliveryCharge,
            available: item.available,
            images: item.images,
            createdAt: item.createdAt,
        });

        return result;
    }, {});

    // Return response
    return {
        businessDetails: {
            name: business.businessName,
            description: business.businessDescription || 'No description available',
            address,
        },
        categories: groupedData,
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
const getProductByBusiness = async (businessId, page = 1, limit = 10, sortOrder = 'desc') => {
    const skip = (page - 1) * limit;

    // Check if the businessId is valid
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        throw new Error('Invalid business ID');
    }

    // Determine sort order based on sortOrder parameter
    const sort = { createdAt: sortOrder === 'desc' ? -1 : 1 };

    // Fetch product items with sorting, categories, and tax information
    const products = await ItemModel.find({
        business: businessId,
        itemType: 'product'
    })
        .populate('parentCategory', 'categoryName tax') // Populate parent category name and tax
        .populate('subCategory', 'categoryName') // Populate subcategory name
        .populate('business', 'businessName') // Populate business name
        .populate('businessType', 'name') // Populate business type name
        .populate({
            path: 'variants.variantId', // Populate variantId fields
            select: 'variantName size color', // Select specific fields from the Variant model
        })
        .sort(sort) // Apply sorting by creation time
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
            productDescription: item.productDescription,
            productFeatures: item.productFeatures,
            productDeliveryCharge: item.productDeliveryCharge,
            nonReturnable: item.nonReturnable,
            variants: item.variants.map(variant => ({
                variantId: variant.variantId?._id,
                variantName: variant.variantId?.variantName || null,
                size: variant.variantId?.size || null,
                color: variant.variantId?.color || null,
                productPrice: variant.productPrice,
                image: variant.image || null, // Include variant image
            })),
            images: item.images,
            businessName: item.business ? item.business.businessName : 'Unknown',
            businessTypeName: item.businessType ? item.businessType.name : 'Unknown',
            taxRate, // Include tax rate
            createdAt: item.createdAt // Include creation time
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

    const item = await ItemModel.findById(itemId);
    if (!item) throw new Error('Item not found');

    // Combine existing images with newly uploaded ones
    const combinedImages = [...item.images, ...imageUrls];
    updateData.images = combinedImages;

    // Update item with the new data
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
const getAllItems = async (itemType) => {
    const filter = itemType ? { itemType } : {};
    return await ItemModel.find(filter);
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