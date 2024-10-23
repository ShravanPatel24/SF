const postService = require('../services/posts.service');
const catchAsync = require("../utils/catchAsync");
const CONSTANTS = require('../config/constant');

// Create a new post
const createPost = catchAsync(async (req, res) => {
    const { user } = req;
    if (!user || !user._id) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.NO_TOKEN });
    }
    const { caption, type } = req.body;
    const files = req.files;
    if ((type === 'reel' || type === 'mixed') && (!files || !files.video || files.video.length === 0)) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: "Video is required for reels or mixed post types." });
    }
    try {
        const newPost = await postService.createPost(user._id, caption, type, files);
        return res.status(CONSTANTS.CREATED_CODE).json({ statusCode: CONSTANTS.CREATED_CODE, message: 'Post created successfully', data: newPost });
    } catch (error) {
        console.error("Error in creating post:", error);
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message })
    }
});

// Get all posts
const getAllPosts = catchAsync(async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const posts = await postService.getAllPosts(Number(page), Number(limit), search);
    res.status(CONSTANTS.SUCCESSFUL).json({
        data: {
            docs: posts.docs,
            totalDocs: posts.totalDocs,
            limit: posts.limit,
            totalPages: posts.totalPages,
            page: posts.page,
            pagingCounter: posts.pagingCounter,
            hasPrevPage: posts.hasPrevPage,
            hasNextPage: posts.hasNextPage,
            prevPage: posts.prevPage,
            nextPage: posts.nextPage,
        },
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.LIST
    });
});

// Get a post by ID
const getPostById = catchAsync(async (req, res) => {
    const post = await postService.getPostById(req.params.id);
    if (!post) {
        return res.status(CONSTANTS.NOT_FOUND).json({ error: CONSTANTS.NOT_FOUND_MSG });
    }
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.DETAILS,
        data: post
    });
});

// Get posts by userId
const getPostsByUserId = catchAsync(async (req, res) => {
    const { user } = req;
    const { userId } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;
    if (!user || !user._id) { return res.status(CONSTANTS.BAD_REQUEST).json({ message: CONSTANTS.NO_TOKEN }) }
    try {
        const posts = await postService.getPostsByUserId(user, userId, Number(page), Number(limit), search);

        res.status(CONSTANTS.SUCCESSFUL).json({
            data: {
                docs: posts.docs,
                totalDocs: posts.totalDocs,
                limit: posts.limit,
                totalPages: posts.totalPages,
                page: posts.page,
                pagingCounter: posts.pagingCounter,
                hasPrevPage: posts.hasPrevPage,
                hasNextPage: posts.hasNextPage,
                prevPage: posts.prevPage,
                nextPage: posts.nextPage,
            },
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.LIST
        });
    } catch (error) {
        if (error.message === CONSTANTS.PERMISSION_DENIED) {
            return res.status(CONSTANTS.UNAUTHORIZED).json({ message: CONSTANTS.PERMISSION_DENIED });
        }
        res.status(CONSTANTS.BAD_REQUEST).json({ error: error.message });
    }
});

// Update a post
const updatePost = catchAsync(async (req, res) => {
    const { caption } = req.body;
    const files = req.files;
    if (!caption && (!files || files.length === 0)) { return res.status(CONSTANTS.BAD_REQUEST).json({ error: CONSTANTS.INVALID_REQUEST }) }
    const postId = req.params.id;
    const updatedPost = await postService.updatePost(postId, caption, files);
    if (!updatedPost) { return res.status(CONSTANTS.NOT_FOUND).json({ error: CONSTANTS.NOT_FOUND_MSG }) }
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.UPDATED,
        data: updatedPost
    });
});

// Delete a post
const deletePost = catchAsync(async (req, res) => {
    const deletedPost = await postService.deletePost(req.params.id);
    if (!deletedPost) { return res.status(CONSTANTS.NOT_FOUND).json({ error: CONSTANTS.NOT_FOUND_MSG }) }
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.DELETED,
        data: deletedPost
    });
});

// Like a post
const likePost = catchAsync(async (req, res) => {
    const { user } = req;
    const { postId } = req.params;
    if (!user || !user._id) { return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.NO_TOKEN }) }
    try {
        await postService.addLike(postId, user._id);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIKE_SUCCESS });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Unlike a post
const unlikePost = catchAsync(async (req, res) => {
    const { user } = req;
    const { postId } = req.params;
    if (!user || !user._id) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.NO_TOKEN });
    }
    try {
        await postService.removeLike(postId, user._id);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.UNLIKE_SUCCESS });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Add a comment
const addComment = catchAsync(async (req, res) => {
    const { user } = req;
    const { postId } = req.params;
    const { text } = req.body;
    if (!user || !user._id) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.NO_TOKEN });
    }
    if (!text) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.COMMENT_TEXT_REQUIRED });
    }
    try {
        await postService.addComment(postId, text, user._id);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.COMMENT_SUCCESS });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Delete a comment
const deleteComment = catchAsync(async (req, res) => {
    const { commentId } = req.params;
    try {
        await postService.deleteComment(commentId);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.COMMENT_DELETED });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Save a post
const savePost = catchAsync(async (req, res) => {
    const { user } = req;
    const { postId } = req.params;

    try {
        const post = await postService.savePost(user._id, postId);
        return res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: 'Post saved successfully', data: post });
    } catch (error) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Unsave a post
const unsavePost = catchAsync(async (req, res) => {
    const { user } = req;
    const { postId } = req.params;

    try {
        const post = await postService.unsavePost(user._id, postId);
        return res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: 'Post unsaved successfully', data: post });
    } catch (error) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Get saved posts
const getSavedPosts = catchAsync(async (req, res) => {
    const { user } = req;
    const { page = 1, limit = 10 } = req.query;
    try {
        const savedPosts = await postService.getSavedPosts(user._id, Number(page), Number(limit));
        return res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: 'Saved posts retrieved successfully', data: savedPosts });
    } catch (error) {
        return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    getPostsByUserId,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    addComment,
    deleteComment,
    savePost,
    unsavePost,
    getSavedPosts,
};