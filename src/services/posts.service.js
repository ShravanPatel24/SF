const Post = require('../models/posts.model');
const { uploadDocuments, deleteFromS3 } = require('../lib/aws_S3');
const CONSTANTS = require('../config/constant');

// Create a new post
const createPost = async (userId, caption, files) => {
    const postData = { userId, caption, likes: 0, comments: [] };
    if (files && files.length > 0) {
        const imageUploadResponse = await uploadDocuments(files, 'postImages');
        const imageUrls = imageUploadResponse.map(file => file.location);
        postData.images = imageUrls;
    } else {
        throw new Error(CONSTANTS.INVALID_REQUEST);
    }
    const newPost = new Post(postData);
    return await newPost.save();
};

// Fetch all posts
const getAllPosts = async () => {
    return await Post.find()
        .populate('userId', 'name') 
        .populate({
            path: 'comments.postedBy',
            select: 'name'
        });
};

// Fetch a post by ID
const getPostById = async (id) => {
    return await Post.findById(id)
        .populate('userId', 'name')
        .populate({
            path: 'comments.postedBy',
            select: 'name _id'
        });
};

// Update a post
const updatePost = async (id, caption, files) => {
    const existingPost = await Post.findById(id);
    if (!existingPost) { throw new Error(CONSTANTS.NOT_FOUND_MSG); }
    const updateData = {};
    if (caption) { updateData.caption = caption; }

    if (files && files.length > 0) {
        if (existingPost.images && existingPost.images.length > 0) {
            const oldImageKeys = existingPost.images.map((imageUrl) => {
                const urlParts = imageUrl.split('/');
                return urlParts[urlParts.length - 1];
            });
            await deleteFromS3(oldImageKeys);
        }
        const imageUploadResponse = await uploadDocuments(files, 'postImages');
        const newImageUrls = imageUploadResponse.map(file => file.location);
        updateData.images = newImageUrls;
    }
    const updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedPost) { throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG); }
    return updatedPost;
};

// Delete a post
const deletePost = async (id) => {
    const post = await Post.findById(id);
    if (!post) { throw new Error(CONSTANTS.NOT_FOUND_MSG); }
    const imageKeys = post.images.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];
    });
    if (imageKeys.length > 0) { await deleteFromS3(imageKeys); }
    return await Post.findByIdAndDelete(id);
};

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost
};