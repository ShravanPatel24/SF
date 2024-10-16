const Joi = require('joi');
const { objectId } = require('./custom.validation');

// Validation for bank details creation
const createBankDetails = {
    body: Joi.object().keys({
        country: Joi.string().required().messages({
            'string.empty': 'Country is required',
        }),
        bankName: Joi.string().required().messages({
            'string.empty': 'Bank name is required',
        }),
        accountName: Joi.string().required().messages({
            'string.empty': 'Account name is required',
        }),
        accountNumber: Joi.string()
            .pattern(/^\d{10,18}$/)
            .message('Account number must be between 10 and 18 digits.')
            .required()
            .messages({
                'string.empty': 'Account number is required',
            }),
        ifscCode: Joi.string()
            .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
            .message('IFSC code must be a valid 11-character code.')
            .required()
            .messages({
                'string.empty': 'IFSC code is required',
            }),
    }),
};

// Validation for updating bank details (no userId in params)
const updateBankDetails = {
    params: Joi.object().keys({
        bankId: Joi.string().custom(objectId).required().messages({
            'any.required': 'Bank ID is required',
        }),
    }),
    body: Joi.object()
        .keys({
            country: Joi.string().optional(),
            bankName: Joi.string().optional(),
            accountName: Joi.string().optional(),
            accountNumber: Joi.string()
                .pattern(/^\d{10,18}$/)
                .message('Account number must be between 10 and 18 digits.')
                .optional(),
            ifscCode: Joi.string()
                .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
                .message('IFSC code must be a valid 11-character code.')
                .optional(),
        })
        .min(1),
};

module.exports = {
    createBankDetails,
    updateBankDetails,
};