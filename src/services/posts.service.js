const Post = require('../models/posts.model');

// Create a new post
const createPost = async (postData) => {
    const newPost = new Post(postData);
    return await newPost.save();
};

// Code for S3 bucket image
// const createPost = async (postData, files) => {
//     // Check if files were uploaded and upload to S3
//     if (files && files.length > 0) {
//         const s3Response = await uploadProfileToS3(files[0], 'postImages');
//         if (s3Response && s3Response.Location) {
//             postData.image = s3Response.Location; // Save the S3 URL to the image field
//         } else {
//             throw new Error('Failed to upload image to S3');
//         }
//     }

//     // Add default values for likes and comments
//     postData.likes = 0;
//     postData.comments = [];

//     // Save the post to the database
//     const newPost = new Post(postData);
//     return await newPost.save();
// };

// Fetch all posts
const getAllPosts = async () => {
    return await Post.find()
        .populate('userId', 'name') // Populate the name of the post creator
        .populate({
            path: 'comments.postedBy', // Populate the name of the comment's author
            select: 'name'
        });
};

// Fetch a post by ID
const getPostById = async (id) => {
    return await Post.findById(id)
        .populate('userId', 'name') // Populating post creator's name
        .populate({
            path: 'comments.postedBy', // Populating each comment's postedBy field
            select: 'name _id'
        });
};

// Update a post
const updatePost = async (id, updateData) => {
    return await Post.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

// Delete a post
const deletePost = async (id) => {
    return await Post.findByIdAndDelete(id);
};

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost
};
