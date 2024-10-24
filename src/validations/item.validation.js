const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createItem = {
    body: Joi.object().keys({
        businessId: Joi.string().custom(objectId),
        businessTypeId: Joi.string().custom(objectId).required(),
        itemType: Joi.string().valid('food', 'room', 'product').required(),
        name: Joi.string(),
        description: Joi.string(),
        price: Joi.number(),
        category: Joi.string(),
        available: Joi.boolean().optional(),
        images: Joi.array().items(Joi.string()).optional(), // Optional images for all item types

        // Specific fields for food items (without dine-in details)
        dishName: Joi.string().when('itemType', { is: 'food', then: Joi.required() }),
        dishDescription: Joi.string().when('itemType', { is: 'food', then: Joi.required() }),
        dishPrice: Joi.number().when('itemType', { is: 'food', then: Joi.required() }),
        foodDeliveryCharge: Joi.number().when('itemType', { is: 'food', then: Joi.required() }),

        // Specific fields for room items
        roomName: Joi.string().when('itemType', { is: 'room', then: Joi.required() }),
        roomType: Joi.string().when('itemType', { is: 'room', then: Joi.required() }),
        roomDescription: Joi.string().when('itemType', { is: 'room', then: Joi.required() }),
        roomPrice: Joi.number().when('itemType', { is: 'room', then: Joi.required() }),
        roomTax: Joi.number().when('itemType', { is: 'room', then: Joi.optional() }),
        checkIn: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
        checkOut: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
        amenities: Joi.array().items(Joi.string()).when('itemType', { is: 'room', then: Joi.optional() }),

        // Specific fields for product items
        productName: Joi.string().when('itemType', { is: 'product', then: Joi.required() }),
        productCategory: Joi.string().when('itemType', { is: 'product', then: Joi.optional() }),
        productDescription: Joi.string().when('itemType', { is: 'product', then: Joi.required() }),
        productPrice: Joi.number().when('itemType', { is: 'product', then: Joi.required() }),
        productDeliveryCharge: Joi.number().when('itemType', {
            is: 'product', then: Joi.required()
        }),
        productFeatures: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
        size: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
        color: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
        nonReturnable: Joi.boolean().when('itemType', { is: 'product', then: Joi.optional() }),
        variants: Joi.array().items(
            Joi.object({
                variantName: Joi.string().required(),
                size: Joi.string().optional(),
                color: Joi.string().optional(),
                productPrice: Joi.number().required(),
                nonReturnable: Joi.boolean().optional(),
            })
        ).when('itemType', { is: 'product', then: Joi.optional() }), // Only required for product items
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
        businessId: Joi.string().required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
    }),
};

const getFoodByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().required(),
    }),
    query: Joi.object().keys({
        page: Joi.number().optional(),
        limit: Joi.number().optional(),
    }),
};

const getProductByBusinessId = {
    params: Joi.object().keys({
        businessId: Joi.string().required(),
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
            // Define optional fields for partial updates
            name: Joi.string().optional(),
            description: Joi.string().optional(),
            price: Joi.number().optional(),
            category: Joi.string().optional(),
            available: Joi.boolean().optional(),
            images: Joi.array().items(Joi.string()).optional(),

            // Fields specific to food (without dine-in details)
            dishName: Joi.string().optional(),
            dishDescription: Joi.string().optional(),
            dishPrice: Joi.number().optional(),
            foodDeliveryCharge: Joi.number().optional(),

            // Fields specific to rooms
            roomName: Joi.string().optional(),
            roomType: Joi.string().optional(),
            roomDescription: Joi.string().optional(),
            roomPrice: Joi.number().optional(),
            roomTax: Joi.number().optional(),
            checkIn: Joi.string().optional(),
            checkOut: Joi.string().optional(),
            amenities: Joi.array().items(Joi.string()).optional(),

            // Fields specific to products
            productName: Joi.string().optional(),
            productCategory: Joi.string().optional(),
            productDescription: Joi.string().optional(),
            productPrice: Joi.number().optional(),
            productDeliveryCharge: Joi.number().optional(),
            productFeatures: Joi.array().items(Joi.string()).optional(),
            size: Joi.array().items(Joi.string()).optional(),
            color: Joi.array().items(Joi.string()).optional(),
            nonReturnable: Joi.boolean().optional(),
            variants: Joi.array().items(
                Joi.object({
                    variantName: Joi.string().optional(),
                    size: Joi.string().optional(),
                    color: Joi.string().optional(),
                    productPrice: Joi.number().optional(),
                    nonReturnable: Joi.boolean().optional(),
                })
            ).optional(),
        })
        .min(1),
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
    deleteItem,
};