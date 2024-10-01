const Joi = require('joi');
const { objectId } = require('./custom.validation');

const create = {
    body: Joi.object().keys({
        businessName: Joi.string().required(),
        businessType: Joi.string().custom(objectId).required(),
        businessDescription: Joi.string().required(),
        mobile: Joi.string().required(),
        email: Joi.string().email().required(),
        businessAddress: Joi.string().required(),
        openingDays: Joi.array().items(Joi.string().required()).min(1).required(),
        sameTimeForAllDays: Joi.boolean().required(),
        // Include openingTime and closingTime when sameTimeForAllDays is true
        openingTime: Joi.string().when('sameTimeForAllDays', {
            is: true,
            then: Joi.string().required(),
            otherwise: Joi.forbidden(),
        }),
        closingTime: Joi.string().when('sameTimeForAllDays', {
            is: true,
            then: Joi.string().required(),
            otherwise: Joi.forbidden(),
        }),
        uniformTiming: Joi.object({
            openingTime: Joi.string().optional(),
            closingTime: Joi.string().optional(),
        }).optional(),
        daywiseTimings: Joi.array().items(Joi.object({
            day: Joi.string().required(),
            openingTime: Joi.string().required(),
            closingTime: Joi.string().required()
        })).optional(),
        images: Joi.array().items(Joi.string()).optional(),
    }),
};

const getBusinessByPartnerId = {
    params: Joi.object().keys({
        partnerId: Joi.string().custom(objectId).required(),
    }),
};

const update = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
    body: Joi.object()
        .keys({
            businessName: Joi.string(),
            businessType: Joi.string().custom(objectId),
            businessDescription: Joi.string(),
            mobile: Joi.string(),
            email: Joi.string().email(),
            businessAddress: Joi.string(),
            openingDays: Joi.array().items(Joi.string()),
            sameTimeForAllDays: Joi.boolean(),
            // Add openingTime and closingTime validation here
            openingTime: Joi.string().when('sameTimeForAllDays', {
                is: true,
                then: Joi.string().required(),
                otherwise: Joi.forbidden(),
            }),
            closingTime: Joi.string().when('sameTimeForAllDays', {
                is: true,
                then: Joi.string().required(),
                otherwise: Joi.forbidden(),
            }),
            uniformTiming: Joi.object({
                openingTime: Joi.string().optional(),
                closingTime: Joi.string().optional(),
            }),
            daywiseTimings: Joi.array().items(Joi.object({
                day: Joi.string(),
                openingTime: Joi.string(),
                closingTime: Joi.string(),
            })),
            images: Joi.array().items(Joi.string()).optional(),
        })
        .min(1),
};

const deleteById = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
};

const getBusinessesNearUser = {
    query: Joi.object().keys({
        latitude: Joi.number()
            .required()
            .min(-90)
            .max(90)
            .messages({
                'any.required': 'Latitude is required',
                'number.min': 'Latitude must be between -90 and 90 degrees',
                'number.max': 'Latitude must be between -90 and 90 degrees',
            }),
        longitude: Joi.number()
            .required()
            .min(-180)
            .max(180)
            .messages({
                'any.required': 'Longitude is required',
                'number.min': 'Longitude must be between -180 and 180 degrees',
                'number.max': 'Longitude must be between -180 and 180 degrees',
            }),
        radiusInKm: Joi.number()
            .required()
            .min(0)
            .messages({
                'any.required': 'Radius is required',
                'number.min': 'Radius must be greater than or equal to 0',
            }),
    }),
};

module.exports = {
    create,
    getBusinessByPartnerId,
    update,
    deleteById,
    getBusinessesNearUser
};
