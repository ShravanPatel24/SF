const Joi = require('joi');
const { objectId } = require('./custom.validation');

// Validation for country code
const countryCodeValidation = Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .message('Country code must be in the format +<digits>, with 1 to 4 digits.')
    .required();

// Address validation
const addressValidation = Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    postalCode: Joi.string().required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    location: Joi.object({
        type: Joi.string().valid('Point').required(),
        coordinates: Joi.array().items(Joi.number()).length(2).required(),
    }).required(),
});

const create = {
    body: Joi.object().keys({
        businessName: Joi.string().required(),
        businessType: Joi.string().custom(objectId).required(),
        businessDescription: Joi.string().required(),
        countryCode: countryCodeValidation,
        mobile: Joi.string().required(),
        email: Joi.string().email().required(),
        businessAddress: addressValidation,
        openingDays: Joi.array().items(Joi.string().required()).min(1).required(),
        sameTimeForAllDays: Joi.boolean().required(),
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
            closingTime: Joi.string().required(),
        })).when('sameTimeForAllDays', {
            is: false,
            then: Joi.array().min(1).required(),
            otherwise: Joi.forbidden(),
        }),
        bannerImages: Joi.array().items(Joi.string()).optional(),
        galleryImages: Joi.array().items(Joi.string()).optional(),
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
            countryCode: countryCodeValidation,
            mobile: Joi.string(),
            email: Joi.string().email(),
            businessAddress: addressValidation,
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
            })).when('sameTimeForAllDays', {
                is: false,
                then: Joi.array().min(1).required(),
                otherwise: Joi.forbidden(),
            }),
            bannerImages: Joi.array().items(Joi.string()).optional(),
            galleryImages: Joi.array().items(Joi.string()).optional(),
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