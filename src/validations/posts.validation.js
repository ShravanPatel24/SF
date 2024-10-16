const Joi = require('joi');
const { objectId } = require('./custom.validation');

// Validation for creating a post
const createPost = {
    body: Joi.object().keys({
        caption: Joi.string().required().max(500).messages({
            'string.empty': 'Caption cannot be empty.',
            'string.max': 'Caption cannot exceed 500 characters.',
        }),
        type: Joi.string().valid('photo', 'reel', 'story').required().messages({
            'any.only': 'Type must be either photo, reel, or story.',
            'any.required': 'Type is required.',
        }),
        likes: Joi.number().optional().default(0).messages({
            'number.base': 'Likes must be a number.',
        }),
        comments: Joi.array().items(
            Joi.object({
                text: Joi.string().required(),
                postedBy: Joi.string().custom(objectId).required(),
                postedAt: Joi.date().optional().messages({
                    'date.base': 'postedAt must be a valid date.',
                }),
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
        search: Joi.string().optional(),
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

// Validation for getting a single post by User ID
const getPostsByUserId = {
    params: Joi.object().keys({
        userId: Joi.string().custom(objectId).required().messages({
            'string.empty': 'User ID is required.',
            'any.required': 'User ID is required.',
        }),
    }),
    query: Joi.object().keys({
        sortBy: Joi.string().valid('createdAt', 'likes', 'comments').optional(),
        limit: Joi.number().integer().optional(),
        page: Joi.number().integer().optional(),
        search: Joi.string().min(3).optional().messages({
            'string.min': 'Search query must be at least 3 characters long.'
        }),
    }),
};

// Validation for updating a post
const updatePost = {
    params: Joi.object().keys({
        id: Joi.string().required().custom(objectId).messages({
            'any.required': 'Post ID is required.',
            'string.empty': 'Post ID is required.',
        }),
    }),
    body: Joi.object().keys({
        caption: Joi.string().max(500).optional().messages({
            'string.max': 'Caption cannot exceed 500 characters.',
        }),
        // No images validation here because images are part of req.files
    }).messages({
        'object.min': 'At least one field (caption or images) must be provided for update.',
    }),
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
    getPostsByUserId,
    updatePost,
    deletePost,
};