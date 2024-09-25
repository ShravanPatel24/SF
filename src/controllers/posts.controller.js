const postService = require('../services/posts.service');
const catchAsync = require("../utils/catchAsync");

// Create a new post
const createPost = catchAsync(async (req, res) => {
    const { userId, caption, image } = req.body;

    const postData = { userId, caption, image, likes: 0, comments: [] };

    // If comments are included in the request, automatically set `postedAt` for each comment
    if (req.body.comments && Array.isArray(req.body.comments)) {
        postData.comments = req.body.comments.map(comment => ({
            text: comment.text,
            postedBy: comment.postedBy,
            postedAt: new Date(),  // Set postedAt to the current date
        }));
    }

    const newPost = await postService.createPost(postData);
    res.status(201).json(newPost);
});

// Code for S3 bucket image
// const createPost = catchAsync(async (req, res) => {
//     const postData = {
//         userId: req.body.userId,  // User ID comes from the request body
//         caption: req.body.caption // Caption comes from the request body
//     };

//     const newPost = await postService.createPost(postData, req.files); // Pass files to handle image upload
//     res.status(201).json(newPost);
// });


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
    const allowedUpdates = ['caption', 'image'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ error: 'Invalid updates!' });
    }

    const updatedPost = await postService.updatePost(req.params.id, req.body);
    if (!updatedPost) {
        return res.status(404).json({ error: 'Post not found' });
    }
    res.status(200).json({
        code: 200,
        message: 'Post updated successfully.',
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
        message: 'Post deleted successfully.',
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