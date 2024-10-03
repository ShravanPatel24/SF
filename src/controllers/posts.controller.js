const postService = require('../services/posts.service');
const catchAsync = require("../utils/catchAsync");

// Create a new post
const createPost = catchAsync(async (req, res) => {
    const { user } = req;
    if (!user || !user._id) { return res.status(400).json({ message: 'User authentication required' }) }
    const { caption } = req.body;
    const files = req.files;
    const newPost = await postService.createPost(user._id, caption, files);
    res.status(201).json(newPost);
});

// Get all posts
const getAllPosts = catchAsync(async (req, res) => {
    const posts = await postService.getAllPosts();
    res.status(200).json({
        code: 200,
        message: 'List retrieved successfully.',
        data: posts
    });
});

// Get a post by ID
const getPostById = catchAsync(async (req, res) => {
    const post = await postService.getPostById(req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    res.status(200).json({
        code: 200,
        message: 'Post retrieved successfully.',
        data: post
    });
});

// Update a post
const updatePost = catchAsync(async (req, res) => {
    const { caption } = req.body;
    const files = req.files;
    if (!caption && (!files || files.length === 0)) { return res.status(400).json({ error: 'At least one field (caption or images) must be provided for update.' }) }
    const postId = req.params.id;
    const updatedPost = await postService.updatePost(postId, caption, files);
    if (!updatedPost) { return res.status(404).json({ error: 'Post not found' }) }
    res.status(200).json({
        code: 200,
        message: 'Post updated successfully, including S3 image handling.',
        data: updatedPost
    });
});

// Delete a post
const deletePost = catchAsync(async (req, res) => {
    const deletedPost = await postService.deletePost(req.params.id);
    if (!deletedPost) {
        return res.status(404).json({ error: 'Post not found' });
    }
    res.status(200).json({
        code: 200,
        message: 'Post and associated images deleted successfully.',
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
