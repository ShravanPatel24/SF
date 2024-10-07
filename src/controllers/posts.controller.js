const postService = require('../services/posts.service');
const catchAsync = require("../utils/catchAsync");
const CONSTANTS = require('../config/constant');

// Create a new post
const createPost = catchAsync(async (req, res) => {
    const { user } = req;
    if (!user || !user._id) { return res.status(CONSTANTS.BAD_REQUEST).json({ message: CONSTANTS.NO_TOKEN }) }
    const { caption } = req.body;
    const files = req.files;
    const newPost = await postService.createPost(user._id, caption, files);
    res.status(CONSTANTS.SUCCESSFUL).json(newPost);
});

// Get all posts
const getAllPosts = catchAsync(async (req, res) => {
    const posts = await postService.getAllPosts();
    res.status(CONSTANTS.SUCCESSFUL).json({
        code: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.LIST,
        data: posts
    });
});

// Get a post by ID
const getPostById = catchAsync(async (req, res) => {
    const post = await postService.getPostById(req.params.id);
    if (!post) {
        return res.status(CONSTANTS.NOT_FOUND).json({ error: CONSTANTS.NOT_FOUND_MSG });
    }
    res.status(CONSTANTS.SUCCESSFUL).json({
        code: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.DETAILS,
        data: post
    });
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
        code: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.UPDATED,
        data: updatedPost
    });
});

// Delete a post
const deletePost = catchAsync(async (req, res) => {
    const deletedPost = await postService.deletePost(req.params.id);
    if (!deletedPost) { return res.status(CONSTANTS.NOT_FOUND).json({ error: CONSTANTS.NOT_FOUND_MSG }) }
    res.status(CONSTANTS.SUCCESSFUL).json({
        code: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.DELETED,
        data: deletedPost
    });
});

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost
};