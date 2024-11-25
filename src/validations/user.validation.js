const Joi = require('joi');
const { objectId } = require('./custom.validation');

const passwordComplexity = Joi.string()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})"))
    .message('Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character (!, @, #, etc.)');

const phoneValidation = Joi.string()
    .pattern(new RegExp('^[0-9]{10,15}$'))
    .message('Phone number must be between 10 and 15 digits and contain only numbers.');

const countryCodeValidation = Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .message('Country code must be in the format +<digits>, with 1 to 4 digits.')
    .required();

const createUser = {
    body: Joi.object().keys({
        name: Joi.string(),
        email: Joi.string().email(),
        countryCode: countryCodeValidation,
        phone: phoneValidation.required(),
        password: passwordComplexity.required(),
        confirmPassword: Joi.string().required().valid(Joi.ref('password')),
        businessType: Joi.string().allow('').allow(null),
        type: Joi.string().required(),
    }),
};

const getUsers = {
    query: Joi.object().keys({
        name: Joi.string(),
        sortBy: Joi.string(),
        type: Joi.string().allow('').allow(null),
        status: Joi.string().allow('').allow(null),
        searchBy: Joi.string().allow('').allow(null),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
        filterDateRange: Joi.alternatives().try(
            Joi.string().valid('past_3_months', 'past_6_months', '2023', '2022'),
            Joi.string().pattern(/^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}$/)
                .message('Custom date range must be in the format YYYY-MM-DD-YYYY-MM-DD')
        ).optional(),
    }),
};

const getUser = {
    params: Joi.object().keys({
        id: Joi.string().custom(objectId),
    }),
};

const updateUser = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId).messages({
            'any.required': 'User ID is required.',
            'string.empty': 'User ID cannot be empty.',
        }),
    }),
    body: Joi.object().keys({
        name: Joi.string().allow(null, '').min(2).max(50).optional().messages({
            'string.min': 'Name should be at least 2 characters.',
            'string.max': 'Name should be at most 50 characters.',
        }),
        email: Joi.string().email().allow(null, '').optional().messages({
            'string.email': 'Invalid email format.',
        }),
        countryCode: Joi.string().optional().allow(null, '').pattern(/^\+\d{1,4}$/).messages({
            'string.empty': 'Country code cannot be empty.',
            'string.pattern.base': 'Country code must be in the format +<digits>, with 1 to 4 digits.'
        }),
        phone: Joi.string().optional().allow(null, '').messages({
            'string.empty': 'Phone number cannot be empty.',
        }),
        bio: Joi.string().max(1000).optional().allow(null, '').messages({
            'string.max': 'Bio cannot exceed 1000 characters.',
        }),
        businessName: Joi.string().optional().allow(null, '').messages({
            'string.empty': 'Business Name cannot be empty.',
        }),
        socialMediaLinks: Joi.array()
            .items(Joi.string().uri().messages({
                'string.uri': 'Each social media link must be a valid URL.'
            }))
            .max(5)
            .optional()
            .allow(null, '')
            .messages({
                'array.base': 'Social media links must be an array.',
                'array.max': 'You can add up to 5 social media links.',
            }),
        password: Joi.string().optional().messages({
            'string.empty': 'Password cannot be empty.'
        }),
        profilePhoto: Joi.any().optional().messages({
            'any.required': 'Profile photo is required.'
        }),
        bannerImages: Joi.any().optional().messages({
            'any.required': 'Banner images are required.'
        }),
        galleryImages: Joi.any().optional().messages({
            'any.required': 'Gallery images are required.'
        }),
        status: Joi.allow('').allow(null),
        isDelete: Joi.number().allow('').allow(null),
    })
};

const deleteUser = {
    params: Joi.object().keys({
        id: Joi.string().custom(objectId),
    }),
};

const login = Joi.object({
    emailOrPhone: Joi.string()
        .required()
        .custom((value, helpers) => {
            if (!validator.isEmail(value) && !validator.isMobilePhone(value)) {
                return helpers.message("Must be a valid email or phone number");
            }
            return value;
        }),
    password: Joi.string().required(),
    type: Joi.string().required()
});

const logout = {
    body: Joi.object().keys({
        refreshToken: Joi.string().required(),
    }),
};

const refreshTokens = {
    body: Joi.object().keys({
        refreshToken: Joi.string().required(),
    }),
};

const forgotPassword = {
    body: Joi.object().keys({
        emailOrPhone: Joi.string().required(),
        type: Joi.string().required(),
    }),
};

const resetPassword = {
    body: Joi.object().keys({
        token: Joi.string().required(),
        newPassword: passwordComplexity.required(),
    }),
};

const verifyEmail = {
    body: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
        otp: Joi.number().required(),
    }),
};

const changePassword = {
    body: Joi.object().keys({
        oldPassword: Joi.string().required(),
        password: passwordComplexity.required(),
    }),
};

const verifyPhoneOtpValidation = {
    body: Joi.object().keys({
        userId: Joi.string().custom(objectId).required(),
        otp: Joi.number().required(),
    }),
};

const updateAboutUs = {
    params: Joi.object().keys({
        id: Joi.string().custom(objectId).required(),
    }),
    body: Joi.object().keys({
        title: Joi.string().required(),
        description: Joi.string().required(),
    }),
};

const getAboutUs = {
    params: Joi.object().keys({
        id: Joi.string().custom(objectId).required(),
    }),
};

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    login,
    refreshTokens,
    forgotPassword,
    resetPassword,
    logout,
    verifyEmail,
    changePassword,
    verifyPhoneOtpValidation,
    updateAboutUs,
    getAboutUs
};