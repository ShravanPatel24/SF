const { UserModel, FollowModel, PostModel } = require('../models');

/**
 * Middleware to check if the current user can access a target user's data or posts.
 */
const canAccessUser = async (req, res, next) => {
    try {
        const { id, userId } = req.params; // General parameters
        const requestingUserId = req.user?._id; // Logged-in user's ID

        // Helper function to determine if the user is a partner
        const isPartner = async (userId) => {
            const user = await UserModel.findById(userId, 'type');
            return user?.type === 'partner';
        };

        // Check if the target user (id or userId) is a partner and bypass checks
        const targetUserId = id || userId;
        if (await isPartner(targetUserId)) {
            return next(); // Skip all checks for partners
        }

        // Case 1: Accessing a user's profile by ID (e.g., /user/profile/:id)
        const isUserProfileRoute = req.originalUrl.includes('/user/profile') && id;
        if (isUserProfileRoute) {
            const targetUser = await UserModel.findById(id, 'isPublic privacySettings');
            if (!targetUser) {
                return res.status(404).json({ statusCode: 404, message: 'User not found.' });
            }

            // Allow access to the user's own profile
            if (requestingUserId.toString() === targetUser._id.toString()) {
                return next();
            }

            // Public profiles allow access
            if (targetUser.isPublic) {
                return next();
            }

            // Check if the requesting user is a follower of the target user for private profiles
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: targetUser._id,
            });

            if (!isFollower) {
                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. Profile is private.',
                });
            }

            return next();
        }

        // Case 2: Accessing a user's posts by userId (e.g., /posts/:userId)
        const isUserPostsRoute = req.originalUrl.includes('/posts') && userId;
        if (isUserPostsRoute) {
            const targetUser = await UserModel.findById(userId, 'isPublic privacySettings');
            if (!targetUser) {
                return res.status(404).json({ statusCode: 404, message: 'User not found.' });
            }

            // Allow access to the user's own posts
            if (requestingUserId.toString() === targetUser._id.toString()) {
                return next();
            }

            // Public profiles allow access to posts
            if (targetUser.isPublic) {
                return next();
            }

            // Check if the requesting user is a follower of the target user for private profiles
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: targetUser._id,
            });

            if (!isFollower) {
                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. Posts are private.',
                });
            }

            return next();
        }

        // Case 3: Accessing a single post by id (e.g., /posts/:id)
        if (id) {
            const post = await PostModel.findById(id).populate('userId', 'type isPublic privacySettings');
            if (!post) {
                return res.status(404).json({ statusCode: 404, message: 'Post not found.' });
            }

            const postOwner = post.userId;

            // Skip checks if the post owner is a partner
            if (postOwner.type === 'partner') {
                return next();
            }

            // Allow access to the user's own post
            if (requestingUserId.toString() === postOwner._id.toString()) {
                return next();
            }

            // Public posts are accessible
            if (postOwner.isPublic) {
                return next();
            }

            // Check if the requesting user is a follower of the post owner
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: postOwner._id,
            });

            if (!isFollower) {
                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. This post is private.',
                });
            }

            return next();
        }

        // Default: Fallback for unsupported routes
        return res.status(400).json({
            statusCode: 400,
            message: 'Invalid request. No valid parameters provided.',
        });
    } catch (error) {
        console.error('Privacy Check Error:', error);
        return res.status(500).json({ statusCode: 500, message: 'Server error' });
    }
};

module.exports = { canAccessUser };