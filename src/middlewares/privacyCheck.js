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
        if (targetUserId && (await isPartner(targetUserId))) {
            return next(); // Skip all checks for partners
        }

        // Case 1: Accessing followers or following lists
        if (req.originalUrl.includes('/followers') || req.originalUrl.includes('/following')) {
            const targetUser = await UserModel.findById(userId, 'isPublic');
            if (!targetUser) {
                return res.status(404).json({ statusCode: 404, message: 'User not found.' });
            }

            // Allow access if the account is public
            if (targetUser.isPublic) {
                return next();
            }

            // Allow access if the requesting user is the account owner
            if (requestingUserId.toString() === targetUser._id.toString()) {
                return next();
            }

            // Private account: Check if the requesting user is a follower
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: targetUser._id,
            });

            if (isFollower) {
                return next();
            }

            return res.status(403).json({
                statusCode: 403,
                message: 'Access denied. This account is private.',
            });
        }

        // Case 2: Accessing a user profile
        if (req.originalUrl.includes('/user/profile') && id) {
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

            // Private profile: Check if the requesting user is a follower
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: targetUser._id,
            });

            if (isFollower) {
                return next();
            }

            return res.status(403).json({
                statusCode: 403,
                message: 'Access denied. Profile is private.',
            });
        }

        // Case 3: Accessing posts
        if (req.originalUrl.includes('/posts')) {
            if (userId) {
                // Accessing posts by userId
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

                // Private profile: Check if the requesting user is a follower
                const isFollower = await FollowModel.exists({
                    follower: requestingUserId,
                    following: targetUser._id,
                });

                if (isFollower) {
                    return next();
                }

                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. Posts are private.',
                });
            }

            if (id) {
                // Accessing a single post by id
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

                if (isFollower) {
                    return next();
                }

                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. This post is private.',
                });
            }
        }

        // Default: Allow access if no specific route logic is matched
        return next();
    } catch (error) {
        console.error('Privacy Check Error:', error);
        return res.status(500).json({ statusCode: 500, message: 'Server error' });
    }
};

module.exports = { canAccessUser };