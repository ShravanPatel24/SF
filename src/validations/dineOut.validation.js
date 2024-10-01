const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createDineOutRequest = {
    body: Joi.object().keys({
        partnerId: Joi.string().custom(objectId).required().messages({
            'any.required': 'Partner ID is required.',
        }),
        businessId: Joi.string().custom(objectId).required().messages({
            'any.required': 'Business ID is required.',
        }),
        date: Joi.string().required().messages({
            'string.empty': 'Date is required.',
        }),
        time: Joi.string().required().messages({
            'string.empty': 'Time is required.',
        }),
        guests: Joi.number().integer().min(1).required().messages({
            'number.base': 'Guests must be a number.',
            'number.min': 'At least 1 guest is required.',
        }),
        dinnerType: Joi.string().valid('Dinner', 'Lunch', 'Breakfast').required().messages({
            'any.only': 'Dinner type must be either Dinner, Lunch, or Breakfast.',
        }),
    }),
};

const getDineOutRequestsForBusiness = {
    params: Joi.object().keys({
        businessId: Joi.string().custom(objectId).required(),
    }),
};

const updateDineOutRequestStatus = {
    params: Joi.object().keys({
        requestId: Joi.string().custom(objectId).required(),
    }),
    body: Joi.object().keys({
        status: Joi.string().valid('Accepted', 'Rejected').required().messages({
            'any.only': 'Status must be either Accepted or Rejected.',
        }),
    }),
};

module.exports = {
    createDineOutRequest,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
};