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

        // Specific fields for food items
        dishName: Joi.string().when('itemType', { is: 'food', then: Joi.required() }),
        dishDescription: Joi.string().when('itemType', { is: 'food', then: Joi.required() }),
        dishPrice: Joi.number().when('itemType', { is: 'food', then: Joi.required() }),
        dineInStatus: Joi.boolean().when('itemType', { is: 'food', then: Joi.optional() }),
        operatingDetails: Joi.array().items(
            Joi.object({
                date: Joi.string().required(),
                startTime: Joi.string().required(),
                endTime: Joi.string().required(),
            })
        ).when('itemType', { is: 'food', then: Joi.optional() }),
        tableManagement: Joi.array().items(
            Joi.object({
                tableNumber: Joi.string().required(),
                seatingCapacity: Joi.number().required(),
            })
        ).when('itemType', { is: 'food', then: Joi.optional() }),

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
        size: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
        color: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
        nonReturnable: Joi.boolean().when('itemType', { is: 'product', then: Joi.optional() }),
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

const updateItem = {
    params: Joi.object().keys({
        itemId: Joi.string().custom(objectId).required(),
    }),
    body: Joi.object()
        .keys({
            name: Joi.string(),
            description: Joi.string(),
            price: Joi.number(),
            category: Joi.string(),
            available: Joi.boolean(),
            images: Joi.array().items(Joi.string()),

            // Fields specific to food
            dishName: Joi.string().when('itemType', { is: 'food', then: Joi.optional() }),
            dishDescription: Joi.string().when('itemType', { is: 'food', then: Joi.optional() }),
            dishPrice: Joi.number().when('itemType', { is: 'food', then: Joi.optional() }),
            dineInStatus: Joi.boolean().when('itemType', { is: 'food', then: Joi.optional() }),
            operatingDetails: Joi.array().items(
                Joi.object({
                    date: Joi.string().required(),
                    startTime: Joi.string().required(),
                    endTime: Joi.string().required(),
                })
            ).when('itemType', { is: 'food', then: Joi.optional() }),
            tableManagement: Joi.array().items(
                Joi.object({
                    tableNumber: Joi.string().required(),
                    seatingCapacity: Joi.number().required(),
                })
            ).when('itemType', { is: 'food', then: Joi.optional() }),

            // Fields specific to rooms
            roomName: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
            roomType: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
            roomDescription: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
            roomPrice: Joi.number().when('itemType', { is: 'room', then: Joi.optional() }),
            roomTax: Joi.number().when('itemType', { is: 'room', then: Joi.optional() }),
            checkIn: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
            checkOut: Joi.string().when('itemType', { is: 'room', then: Joi.optional() }),
            amenities: Joi.array().items(Joi.string()).when('itemType', { is: 'room', then: Joi.optional() }),

            // Fields specific to products
            productName: Joi.string().when('itemType', { is: 'product', then: Joi.optional() }),
            productCategory: Joi.string().when('itemType', { is: 'product', then: Joi.optional() }),
            productDescription: Joi.string().when('itemType', { is: 'product', then: Joi.optional() }),
            productPrice: Joi.number().when('itemType', { is: 'product', then: Joi.optional() }),
            size: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
            color: Joi.array().items(Joi.string()).when('itemType', { is: 'product', then: Joi.optional() }),
            nonReturnable: Joi.boolean().when('itemType', { is: 'product', then: Joi.optional() }),
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
    updateItem,
    deleteItem,
};