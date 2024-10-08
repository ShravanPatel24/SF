const { PostModel, PostCommentModel, PostLikeModel } = require('../models');
const { uploadDocuments, deleteFromS3 } = require('../lib/aws_S3');
const CONSTANTS = require('../config/constant');

// Create a new post
const createPost = async (user, caption, type, files) => {
    try {
        if (user.type === 'partner') { throw new Error(CONSTANTS.PERMISSION_DENIED) }
        const postData = {
            userId: user._id,
            caption,
            type,
            likes: 0,
            comments: []
        };
        // Handle image upload for photos or stories
        if (type === 'photo' || type === 'story') {
            if (files && files.images && files.images.length > 0) {
                const imageUploadResponse = await uploadDocuments(files.images, 'postImages');
                const imageUrls = imageUploadResponse.map(file => file.location);
                postData.images = imageUrls;
            } else {
                throw new Error(CONSTANTS.IMAGE_REQUIRED);
            }
        }
        // Handle video upload for reels or mixed posts
        if (type === 'reel' || type === 'mixed') {
            if (files && files.video && files.video.length > 0) {
                const videoUploadResponse = await uploadDocuments(files.video, 'postVideos');
                const videoUrl = videoUploadResponse[0].location;
                postData.videoUrl = videoUrl;
            } else {
                throw new Error(CONSTANTS.VIDEO_REQUIRED);
            }
        }
        const newPost = new PostModel(postData);
        const savedPost = await newPost.save();
        return savedPost;
    } catch (error) {
        console.error("Error in creating post service:", error);
        throw error;
    }
};

// Fetch all posts
const getAllPosts = async (page = 1, limit = 10, search = '') => {
    const options = {
        page,
        limit,
        populate: [
            { path: 'userId', select: 'name' },
            { path: 'likeCount' },
            { path: 'commentCount' }
        ],
        sort: { createdAt: -1 },
    };
    const query = search ? { caption: { $regex: search, $options: 'i' } } : {};
    const posts = await PostModel.paginate(query, options);
    // Fetch comments and likes for each post
    const postsWithDetails = await Promise.all(
        posts.docs.map(async (post) => {
            const comments = await PostCommentModel.find({ postId: post._id })
                .populate('postedBy', 'name')
                .exec();
            const likes = await PostLikeModel.find({ postId: post._id })
                .populate('userId', 'name')
                .exec();
            return {
                ...post.toObject(),
                comments,
                likes,
            };
        })
    );
    return { ...posts, docs: postsWithDetails };
};

// Fetch a post by ID
const getPostById = async (id) => {
    const post = await PostModel.findById(id)
        .populate('userId', 'name')
        .populate('likeCount')
        .populate('commentCount')
        .exec();
    if (!post) { throw new Error(CONSTANTS.NOT_FOUND) }

    const comments = await PostCommentModel.find({ postId: post._id })
        .populate('postedBy', 'name _id')
        .exec();
    return {
        ...post.toObject(),
        comments,
    };
};

// Fetch posts by userId
const getPostsByUserId = async (user, userId, page = 1, limit = 10, search = '') => {
    if (user.type === 'partner') { throw new Error(CONSTANTS.PERMISSION_DENIED) }
    const options = {
        page,
        limit,
        populate: [
            { path: 'userId', select: 'name' },
            { path: 'likeCount' },
            { path: 'commentCount' }
        ],
        sort: { createdAt: -1 },
    };
    const query = { userId };
    // Add search condition if search query is provided
    if (search && search.trim() !== '') { query.caption = { $regex: search, $options: 'i' }; }
    const posts = await PostModel.paginate(query, options);
    const postsWithDetails = await Promise.all(
        posts.docs.map(async (post) => {
            const comments = await PostCommentModel.find({ postId: post._id })
                .populate('postedBy', 'name')
                .exec();
            const likes = await PostLikeModel.find({ postId: post._id })
                .populate('userId', 'name')
                .exec();
            return {
                ...post.toObject(),
                comments,
                likes,
            };
        })
    );
    return { ...posts, docs: postsWithDetails };
};

// Update a post
const updatePost = async (id, caption, files) => {
    const existingPost = await PostModel.findById(id);
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
    const updatedPost = await PostModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedPost) { throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG); }
    return updatedPost;
};

// Delete a post
const deletePost = async (id) => {
    const post = await PostModel.findById(id);
    if (!post) { throw new Error(CONSTANTS.NOT_FOUND_MSG) }
    const imageKeys = post.images.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];
    });
    if (imageKeys.length > 0) { await deleteFromS3(imageKeys) }
    if (post.type === 'reel' && post.videoUrl) {
        const videoUrlParts = post.videoUrl.split('/');
        const videoKey = videoUrlParts[videoUrlParts.length - 1];
        await deleteFromS3([videoKey]);
    }
    return await PostModel.findByIdAndDelete(id);
};

// Add a like
const addLike = async (postId, userId) => {
    const existingLike = await PostLikeModel.findOne({ postId, userId });
    if (existingLike) { throw new Error(CONSTANTS.ALREADY_LIKED_POST) }
    const like = new PostLikeModel({ postId, userId });
    await like.save();
};

// Remove a like
const removeLike = async (postId, userId) => {
    const existingLike = await PostLikeModel.findOne({ postId, userId });
    if (!existingLike) { throw new Error(CONSTANTS.NOT_LIKED_POST) }
    await PostLikeModel.findByIdAndDelete(existingLike._id);
};

// Add a comment
const addComment = async (postId, text, userId) => {
    const comment = new PostCommentModel({ postId, text, postedBy: userId });
    await comment.save();
};

// Delete a comment
const deleteComment = async (commentId) => {
    await PostCommentModel.findByIdAndDelete(commentId);
};

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    getPostsByUserId,
    updatePost,
    deletePost,
    addLike,
    removeLike,
    addComment,
    deleteComment
};