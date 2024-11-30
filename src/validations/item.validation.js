const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createItem = {
    body: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
        businessTypeId: Joi.string().custom(objectId).required(),
        itemType: Joi.string().valid('food', 'room', 'product').required(),
        available: Joi.boolean().optional(),
        images: Joi.array().items(Joi.string()).optional(),

        // Common fields for all item types (optional for room type) 
        parentCategory: Joi.string().custom(objectId).optional(),
        subCategory: Joi.string().custom(objectId).optional(),

        // Specific fields for food items
        dishName: Joi.string().when('itemType', { is: 'food', then: Joi.required() }),
        dishDescription: Joi.string().when('itemType', { is: 'food', then: Joi.required() }),
        dishPrice: Joi.number().when('itemType', { is: 'food', then: Joi.required() }),
        foodDeliveryCharge: Joi.number().when('itemType', { is: 'food', then: Joi.required() }),

        // Quantity (required for food and room, optional for product)
        quantity: Joi.number().min(1).when('itemType', {
            is: Joi.valid('food', 'room'),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),

        // Specific fields for room items
        roomName: Joi.string().when('itemType', { is: 'room', then: Joi.required() }),
        roomCategory: Joi.string().when('itemType', { is: 'room', then: Joi.required() }),
        roomDescription: Joi.string().when('itemType', { is: 'room', then: Joi.required() }),
        roomPrice: Joi.number().when('itemType', { is: 'room', then: Joi.required() }),
        roomCapacity: Joi.number().when('itemType', { is: 'room', then: Joi.required() }),
        roomTax: Joi.number().when('itemType', { is: 'room', then: Joi.optional() }),
        checkIn: Joi.date().iso().when('itemType', { is: 'room', then: Joi.optional() })
            .messages({ 'date.format': 'Check-in must be a valid ISO date format' }),
        checkOut: Joi.date().iso().when('itemType', { is: 'room', then: Joi.optional() })
            .messages({ 'date.format': 'Check-out must be a valid ISO date format' }),
        amenities: Joi.array().items(Joi.string()).when('itemType', { is: 'room', then: Joi.optional() }),

        // Specific fields for product items
        productName: Joi.string().when('itemType', { is: 'product', then: Joi.required() }),
        productDescription: Joi.string().when('itemType', { is: 'product', then: Joi.required() }),
        productDeliveryCharge: Joi.number().when('itemType', { is: 'product', then: Joi.required() }),
        productFeatures: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
        nonReturnable: Joi.boolean().when('itemType', { is: 'product', then: Joi.optional() }),
        variants: Joi.array().items(
            Joi.object({
                variantId: Joi.string().custom(objectId).required(), // Reference to admin-defined variant
                productPrice: Joi.number().required(), // Price set by the partner
                quantity: Joi.number().min(0).required(), // Quantity for the variant
                nonReturnable: Joi.boolean().optional(), // Non-returnable status
                image: Joi.string().optional(), // Variant-specific image
            })
        ).when('itemType', { is: 'product', then: Joi.required() }),
    }),
};

const getItemById = {
    params: Joi.object().keys({
        itemId: Joi.string().custom(objectId).required(),
    }),
};

const getItemsByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
};

const getItemsByBusinessTypeId = {
    params: Joi.object().keys({
        businessTypeId: Joi.string().custom(objectId).required(),
    }),
};

const getRoomsByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(), // Validate businessId as a valid ObjectId
    }),
    query: Joi.object().keys({
        page: Joi.number().integer().min(1).optional(),       // Validate page as an optional positive integer
        limit: Joi.number().integer().min(1).optional(),      // Validate limit as an optional positive integer
        sortOrder: Joi.string().valid('asc', 'desc').optional() // Allow sortOrder with 'asc' or 'desc'
    }),
};

const getFoodByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional() // Validate sortOrder
    }),
};

const getProductByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
        sortOrder: Joi.string().valid('asc', 'desc').optional() // Allow only 'asc' or 'desc'
    }),
};

const updateItem = {
    params: Joi.object().keys({
        itemId: Joi.string().custom(objectId).required(),
    }),
    body: Joi.object()
        .keys({
            available: Joi.boolean().optional(),
            images: Joi.array().items(Joi.string()).optional(),

            // Common category fields (forbidden for room)
            parentCategory: Joi.string().custom(objectId).optional(),
            subCategory: Joi.string().custom(objectId).optional(),

            // Fields specific to food
            dishName: Joi.string().optional(),
            dishDescription: Joi.string().optional(),
            dishPrice: Joi.number().optional(),
            foodDeliveryCharge: Joi.number().optional(),

            // Quantity for food and room
            quantity: Joi.number().min(0).optional(),

            // Fields specific to rooms
            roomName: Joi.string().optional(),
            roomCategory: Joi.string().optional(),
            roomDescription: Joi.string().optional(),
            roomPrice: Joi.number().optional(),
            roomCapacity: Joi.number().optional(),
            roomTax: Joi.number().optional(),
            checkIn: Joi.date().iso().optional(),
            checkOut: Joi.date().iso().optional(),
            amenities: Joi.array().items(Joi.string()).optional(),

            // Fields specific to products
            productName: Joi.string().optional(),
            productCategory: Joi.string().optional(),
            productDescription: Joi.string().optional(),
            productDeliveryCharge: Joi.number().optional(),
            productFeatures: Joi.array().items(Joi.string()).optional(),
            nonReturnable: Joi.boolean().optional(),
            variants: Joi.array().items(
                Joi.object({
                    variantId: Joi.string().custom(objectId).optional(), // Admin-defined variant reference
                    productPrice: Joi.number().optional(), // Price update
                    quantity: Joi.number().optional(),
                    image: Joi.string().optional(), // Image update for variants
                })
            ).optional(),
        })
        .min(1), // Ensure at least one field is being updated
};

const deleteItem = {
    params: Joi.object().keys({
        itemId: Joi.string().custom(objectId).required(),
    }),
};

const deleteImageFromItem = Joi.object({
    imageKey: Joi.string().required().messages({
        'string.empty': 'Image key is required',
        'any.required': 'Image key is required',
    }),
    variantId: Joi.string().optional(),
});

module.exports = {
    createItem,
    getItemById,
    getItemsByBusinessId,
    getItemsByBusinessTypeId,
    getRoomsByBusinessId,
    getFoodByBusinessId,
    getProductByBusinessId,
    updateItem,
    deleteItem,
    deleteImageFromItem
};