const { PostModel, PostCommentModel, PostLikeModel, FollowModel } = require('../models');
const { s3Service } = require('../services');
const CONSTANTS = require('../config/constant');

// Create a new post
const createPost = async (userId, caption, type, files) => {
    try {
        const postData = {
            userId,
            caption,
            type,
            likes: 0,
            comments: [],
        };

        // Handle image upload for photos or stories
        if (type === 'photo' || type === 'story') {
            if (!files || !files.images || files.images.length === 0) {
                throw new Error(CONSTANTS.IMAGE_REQUIRED);  // Throw error if images are required but missing
            }

            const imageUploadResponse = await s3Service.uploadDocuments(files.images, 'postImages');
            postData.images = imageUploadResponse.map(file => file.key);  // Use 'key' for image storage
        }

        // Handle video upload for reels or mixed posts
        if (type === 'reel' || type === 'mixed') {
            if (!files || !files.video || files.video.length === 0) {
                throw new Error(CONSTANTS.VIDEO_REQUIRED);  // Throw error if video is required but missing
            }

            const videoUploadResponse = await s3Service.uploadDocuments(files.video, 'postVideos');
            postData.videoUrl = videoUploadResponse[0].key;  // Store video URL
        }

        const newPost = new PostModel(postData);
        const savedPost = await newPost.save();
        return savedPost;
    } catch (error) {
        console.error('Error in creating post service:', error);
        throw error;  // Propagate the error back to the controller
    }
};

// Fetch all posts
const getAllPosts = async (page = 1, limit = 10, search = '', currentUserId) => {
    const options = {
        page,
        limit,
        populate: [
            { path: 'userId', select: 'name profilePhoto privacySettings isPublic' },
            { path: 'likeCount' },
            { path: 'commentCount' },
        ],
        sort: { createdAt: -1 },
    };

    const query = search ? { caption: { $regex: search, $options: 'i' } } : {};

    const posts = await PostModel.paginate(query, options);

    // Apply privacy filtering and populate likes and comments
    const filteredPosts = await Promise.all(
        posts.docs.map(async (post) => {
            const postOwner = post.userId;
            if (postOwner.isPublic) {
                const comments = await PostCommentModel.find({ postId: post._id })
                    .populate('postedBy', 'name profilePhoto')
                    .exec();
                const likes = await PostLikeModel.find({ postId: post._id })
                    .populate('userId', 'name profilePhoto')
                    .exec();

                // Map _id to id and remove _id from the response
                const cleanedPost = {
                    ...post.toObject(),
                    id: post._id,
                    comments: comments.map((comment) => ({
                        ...comment.toObject(),
                        id: comment._id,
                        postedBy: {
                            ...comment.postedBy.toObject(),
                            id: comment.postedBy._id,
                        },
                    })),
                    likes: likes.map((like) => ({
                        ...like.toObject(),
                        id: like._id,
                        userId: {
                            ...like.userId.toObject(),
                            id: like.userId._id,
                        },
                    })),
                };

                delete cleanedPost._id; // Remove _id
                return cleanedPost;
            }

            // Check privacy for current user
            const privacy = postOwner.privacySettings.message; // Example: 'Friends', 'No One', 'All'
            if (privacy === 'Friends') {
                const isFollower = await FollowModel.exists({ follower: currentUserId, following: postOwner._id });
                if (isFollower) {
                    const comments = await PostCommentModel.find({ postId: post._id })
                        .populate('postedBy', 'name profilePhoto')
                        .exec();
                    const likes = await PostLikeModel.find({ postId: post._id })
                        .populate('userId', 'name profilePhoto')
                        .exec();

                    const cleanedPost = {
                        ...post.toObject(),
                        id: post._id,
                        comments: comments.map((comment) => ({
                            ...comment.toObject(),
                            id: comment._id,
                            postedBy: {
                                ...comment.postedBy.toObject(),
                                id: comment.postedBy._id,
                            },
                        })),
                        likes: likes.map((like) => ({
                            ...like.toObject(),
                            id: like._id,
                            userId: {
                                ...like.userId.toObject(),
                                id: like.userId._id,
                            },
                        })),
                    };

                    delete cleanedPost._id; // Remove _id
                    return cleanedPost;
                }
            }
            return null; // Default deny
        })
    );

    return { ...posts, docs: filteredPosts.filter(Boolean) };
};

// Fetch a post by ID
const getPostById = async (id) => {
    const post = await PostModel.findById(id)
        .populate('userId', 'name profilePhoto') // Populate user details
        .populate('likeCount') // Ensure like count is populated
        .populate('commentCount') // Ensure comment count is populated
        .exec();

    if (!post) {
        throw new Error(CONSTANTS.NOT_FOUND);
    }

    // Fetch and populate comments
    const comments = await PostCommentModel.find({ postId: post._id })
        .populate('postedBy', 'name profilePhoto _id')
        .exec();

    // Fetch and populate likes
    const likes = await PostLikeModel.find({ postId: post._id })
        .populate('userId', 'name profilePhoto _id')
        .exec();

    const postObject = post.toObject();

    // Remove duplicate `id` fields and control the structure
    postObject.comments = comments.map((comment) => {
        const commentObj = comment.toObject();
        delete commentObj._id; // Optionally remove `_id`
        return {
            ...commentObj,
            id: commentObj._id, // Map `_id` to `id`
        };
    });

    postObject.likes = likes.map((like) => {
        const likeObj = like.toObject();
        delete likeObj._id; // Optionally remove `_id`
        return {
            ...likeObj,
            id: likeObj._id, // Map `_id` to `id`
        };
    });

    // Replace `_id` with `id` at the top level if needed
    postObject.id = postObject._id;
    delete postObject._id;

    return postObject;
};

// Fetch posts by user
const getPostsByUser = async (user, page = 1, limit = 10, search = '') => {
    // Check if user is a partner
    if (user.type === 'partner') {
        throw new Error(CONSTANTS.PERMISSION_DENIED);
    }

    const options = {
        page,
        limit,
        populate: [
            { path: 'userId', select: 'name profilePhoto' },
            { path: 'likeCount' },
            { path: 'commentCount' },
        ],
        sort: { createdAt: -1 },
    };

    // Query for fetching posts by logged-in user
    const query = { userId: user._id };

    // Add search condition if search query is provided
    if (search && search.trim() !== '') {
        query.caption = { $regex: search, $options: 'i' };
    }

    const posts = await PostModel.paginate(query, options);

    // Fetch detailed comments and likes for each post
    const postsWithDetails = await Promise.all(
        posts.docs.map(async (post) => {
            const comments = await PostCommentModel.find({ postId: post._id })
                .populate('postedBy', 'name profilePhoto')
                .exec();
            const likes = await PostLikeModel.find({ postId: post._id })
                .populate('userId', 'name profilePhoto')
                .exec();

            // Format the post to remove `_id` or `id` duplication
            const postObj = post.toObject();
            postObj.comments = comments.map((comment) => {
                const commentObj = comment.toObject();
                commentObj.id = commentObj._id; // Map `_id` to `id`
                delete commentObj._id; // Remove `_id`
                return commentObj;
            });
            postObj.likes = likes.map((like) => {
                const likeObj = like.toObject();
                likeObj.id = likeObj._id; // Map `_id` to `id`
                delete likeObj._id; // Remove `_id`
                return likeObj;
            });
            postObj.id = postObj._id; // Map `_id` to `id`
            delete postObj._id; // Remove `_id`

            return postObj;
        })
    );

    return { ...posts, docs: postsWithDetails };
};

// Fetch posts by userId
const getPostsBySpecificUserId = async (userId, page = 1, limit = 10, search = '') => {
    try {
        const query = { userId }; // Match the userId

        // Add search filter if a search term is provided
        if (search && search.trim() !== '') {
            query.caption = { $regex: search, $options: 'i' }; // Case-insensitive search on caption
        }

        const options = {
            page,
            limit,
            populate: [
                { path: 'userId', select: 'name profilePhoto' }, // Include user details
            ],
            sort: { createdAt: -1 }, // Sort by most recent posts
        };

        const posts = await PostModel.paginate(query, options);

        // Add additional details like comments and likes if needed
        const postsWithDetails = await Promise.all(
            posts.docs.map(async (post) => {
                const comments = await PostCommentModel.find({ postId: post._id })
                    .populate('postedBy', 'name profilePhoto')
                    .exec();

                const likes = await PostLikeModel.find({ postId: post._id })
                    .populate('userId', 'name profilePhoto')
                    .exec();

                const postObj = post.toObject();
                postObj.comments = comments.map((comment) => ({
                    ...comment.toObject(),
                    id: comment._id,
                }));
                postObj.likes = likes.map((like) => ({
                    ...like.toObject(),
                    id: like._id,
                }));
                postObj.id = post._id;
                delete postObj._id;

                return postObj;
            })
        );

        return {
            ...posts,
            docs: postsWithDetails, // Replace docs with detailed posts
        };
    } catch (error) {
        console.error('Error in getPostsBySpecificUserId:', error);
        throw new Error('Failed to fetch posts by user ID');
    }
};

// Update a post
const updatePost = async (id, caption, files) => {
    const existingPost = await PostModel.findById(id);
    if (!existingPost) { throw new Error(CONSTANTS.NOT_FOUND_MSG); }
    const updateData = {};
    if (caption) { updateData.caption = caption; }
    // Handle updating images if provided
    if (files && files.images && files.images.length > 0) {
        // Delete old images from S3
        if (existingPost.images && existingPost.images.length > 0) {
            const oldImageKeys = existingPost.images.map((imageUrl) => {
                const urlParts = imageUrl.split('/');
                return urlParts[urlParts.length - 1];
            });
            await deleteFromS3(oldImageKeys);
        }
        // Upload new images
        const imageUploadResponse = await uploadDocuments(files.images, 'postImages');
        const newImageKeys = imageUploadResponse.map(file => file.key);
        updateData.images = newImageKeys;
    }
    // Handle updating videos for reels or mixed posts
    if (files && files.video && files.video.length > 0) {
        if (existingPost.videoUrl) {
            // Delete the old video from S3
            const oldVideoUrlParts = existingPost.videoUrl.split('/');
            const oldVideoKey = oldVideoUrlParts[oldVideoUrlParts.length - 1];
            await deleteFromS3([oldVideoKey]);
        }
        // Upload new video
        const videoUploadResponse = await uploadDocuments(files.video, 'postVideos');
        const newVideoKey = videoUploadResponse[0].key;
        updateData.videoUrl = newVideoKey;
    }
    const updatedPost = await PostModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!updatedPost) { throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG); }
    return updatedPost;
};

// Delete a post
const deletePost = async (id) => {
    const post = await PostModel.findById(id);
    if (!post) { throw new Error(CONSTANTS.NOT_FOUND_MSG); }
    // Extract and delete image keys from S3
    const imageKeys = post.images.map((imageUrl) => {
        const urlParts = imageUrl.split('/');
        return urlParts[urlParts.length - 1];  // Extract the key from the URL
    });
    if (imageKeys.length > 0) { await s3Service.deleteFromS3(imageKeys) }
    // If the post is a reel or mixed type, delete the video from S3
    if (post.type === 'reel' && post.videoUrl) {
        const videoUrlParts = post.videoUrl.split('/');
        const videoKey = videoUrlParts[videoUrlParts.length - 1];
        await deleteFromS3([videoKey]);
    }
    return await PostModel.findByIdAndDelete(id);
};

// Add a like
const addLike = async (postId, userId) => {
    const post = await PostModel.findById(postId).populate('userId', 'privacySettings isPublic');
    if (!post) throw new Error('Post not found.');

    const postOwner = post.userId;

    // Check privacy settings
    const privacy = postOwner.privacySettings.likes;

    if (privacy === 'No One') {
        throw new Error('You are not allowed to like this post.');
    }

    if (privacy === 'Friends') {
        const isFriend = await FollowModel.exists({ follower: userId, following: postOwner._id });
        if (!isFriend) {
            throw new Error('You are not allowed to like this post.');
        }
    }

    // Proceed with liking if allowed
    const existingLike = await PostLikeModel.findOne({ postId, userId });
    if (existingLike) throw new Error('You have already liked this post.');
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
    const post = await PostModel.findById(postId).populate('userId', 'privacySettings isPublic');
    if (!post) throw new Error('Post not found.');

    const postOwner = post.userId;

    // Check privacy settings
    const privacy = postOwner.privacySettings.comments;

    if (privacy === 'No One') {
        throw new Error('You are not allowed to comment on this post.');
    }

    if (privacy === 'Friends') {
        const isFriend = await FollowModel.exists({ follower: userId, following: postOwner._id });
        if (!isFriend) {
            throw new Error('You are not allowed to comment on this post.');
        }
    }

    // Proceed with adding comment if allowed
    const comment = new PostCommentModel({ postId, text, postedBy: userId });
    await comment.save();
};

// Delete a comment
const deleteComment = async (commentId) => {
    await PostCommentModel.findByIdAndDelete(commentId);
};

// Save a post
const savePost = async (userId, postId) => {
    const post = await PostModel.findById(postId);
    if (!post) throw new Error('Post not found.');
    if (!post.savedBy) { post.savedBy = [] }
    if (post.savedBy.includes(userId)) throw new Error('Post is already saved.');
    post.savedBy.push(userId);
    await post.save();
    return post;
};

// Unsave a post
const unsavePost = async (userId, postId) => {
    const post = await PostModel.findById(postId);
    if (!post) throw new Error('Post not found.');
    post.savedBy = post.savedBy.filter(id => !id.equals(userId));
    await post.save();
    return post;
};

// Get saved posts list for a user
const getSavedPosts = async (userId, page = 1, limit = 10) => {
    const options = {
        page,
        limit,
        populate: [
            { path: 'userId', select: 'name profilePhoto' },
        ],
        sort: { createdAt: -1 },
    };

    // Fetch saved posts
    const savedPosts = await PostModel.paginate({ savedBy: userId }, options);

    // Fetch detailed likes and comments for each saved post
    const postsWithDetails = await Promise.all(
        savedPosts.docs.map(async (post) => {
            // Fetch comments
            const comments = await PostCommentModel.find({ postId: post._id })
                .populate('postedBy', 'name profilePhoto')
                .exec();

            // Fetch likes
            const likes = await PostLikeModel.find({ postId: post._id })
                .populate('userId', 'name profilePhoto')
                .exec();

            // Format the post to include likes and comments
            const postObj = post.toObject();

            postObj.comments = comments.map((comment) => {
                const commentObj = comment.toObject();
                return {
                    ...commentObj,
                    id: commentObj._id, // Map `_id` to `id`
                };
            });

            postObj.likes = likes.map((like) => {
                const likeObj = like.toObject();
                return {
                    ...likeObj,
                    id: likeObj._id, // Map `_id` to `id`
                };
            });

            postObj.id = postObj._id; // Map `_id` to `id`
            delete postObj._id; // Remove `_id`

            return postObj;
        })
    );

    // Return the modified response
    return { ...savedPosts, docs: postsWithDetails };
};

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    getPostsByUser,
    getPostsBySpecificUserId,
    updatePost,
    deletePost,
    addLike,
    removeLike,
    addComment,
    deleteComment,
    savePost,
    unsavePost,
    getSavedPosts,
};