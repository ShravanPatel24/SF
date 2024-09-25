const Joi = require('joi');
const { objectId } = require('./custom.validation'); // Assuming you have objectId custom validator

// Validation for creating a post
const createPost = {
    body: Joi.object().keys({
        userId: Joi.string().required().custom(objectId).messages({
            'string.empty': 'User ID is required.',
            'any.required': 'User ID is required.'
        }),
        caption: Joi.string().required().max(500).messages({
            'string.empty': 'Caption cannot be empty.',
            'string.max': 'Caption cannot exceed 500 characters.'
        }),
        image: Joi.string().uri().required().messages({
            'string.uri': 'Image must be a valid URL.',
            'string.empty': 'Image URL is required.'
        }),
        likes: Joi.number().optional().default(0).messages({
            'number.base': 'Likes must be a number.',
        }),
        comments: Joi.array().items(
            Joi.object({
                text: Joi.string().required(),
                postedBy: Joi.string().custom(objectId).required(),
                postedAt: Joi.date().optional().messages({
                    'date.base': 'postedAt must be a valid date.'
                })
            })
        ).optional().messages({
            'array.base': 'Comments must be an array.',
        }),
    }),
};

// Validation for getting posts with optional query parameters
const getPosts = {
    query: Joi.object().keys({
        userId: Joi.string().custom(objectId).optional(),
        sortBy: Joi.string().valid('createdAt', 'likes', 'comments').optional(),
        limit: Joi.number().integer().optional(),
        page: Joi.number().integer().optional(),
    }),
};

// Validation for getting a single post by ID
const getPost = {
    params: Joi.object().keys({
        id: Joi.string().custom(objectId).required().messages({
            'string.empty': 'Post ID is required.',
            'any.required': 'Post ID is required.',
        }),
    }),
};

// Validation for updating a post
const updatePost = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId),
    }),
    body: Joi.object().keys({
        caption: Joi.string().max(500).optional().messages({
            'string.max': 'Caption cannot exceed 500 characters.',
        }),
        image: Joi.string().uri().optional().messages({
            'string.uri': 'Image must be a valid URL.',
        }),
    }).min(1), // At least one field is required to update
};

// Validation for deleting a post
const deletePost = {
    params: Joi.object().keys({
        id: Joi.string().custom(objectId).required().messages({
            'string.empty': 'Post ID is required.',
            'any.required': 'Post ID is required.'
        }),
    }),
};

module.exports = {
    createPost,
    getPosts,
    getPost,
    updatePost,
    deletePost,
};