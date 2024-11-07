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
        variants: Joi.array().items(
            Joi.object({
                variantName: Joi.string().required(),
                size: Joi.string().optional(),
                color: Joi.string().optional(),
                productPrice: Joi.number().required(),
                nonReturnable: Joi.boolean().optional(),
                image: Joi.string().optional(),
            })
        ).when('itemType', { is: 'product', then: Joi.optional() }),
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
        businessId: Joi.string().custom(objectId).required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
    }),
};

const getFoodByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
    }),
};

const getProductByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
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

            // Fields specific to rooms
            roomName: Joi.string().optional(),
            roomCategory: Joi.string().optional(),
            roomDescription: Joi.string().optional(),
            roomPrice: Joi.number().optional(),
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
            variants: Joi.array().items(
                Joi.object({
                    variantName: Joi.string().optional(),
                    size: Joi.string().optional(),
                    color: Joi.string().optional(),
                    productPrice: Joi.number().optional(),
                    nonReturnable: Joi.boolean().optional(),
                    image: Joi.string().optional(),
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

module.exports = {
    createItem,
    getItemById,
    getItemsByBusinessId,
    getItemsByBusinessTypeId,
    getRoomsByBusinessId,
    getFoodByBusinessId,
    getProductByBusinessId,
    updateItem,
    deleteItem
};