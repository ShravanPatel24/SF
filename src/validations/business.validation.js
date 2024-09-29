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

module.exports = {
    create,
    getBusinessByPartnerId,
    update,
    deleteById,
};
