const { UserModel, FollowModel, PostModel } = require('../models');

/**
 * Middleware to check if the current user can access a target user's data or posts.
 */
const canAccessUser = async (req, res, next) => {
    try {
        const { id, userId } = req.params; // General parameters
        const requestingUserId = req.user?._id; // Logged-in user's ID

        // Check if the route is for a user profile
        const isProfileRoute = req.originalUrl.includes('/profile/');
        if (isProfileRoute) {
            const targetUser = await UserModel.findById(id, 'isPublic privacySettings');
            if (!targetUser) return res.status(404).json({ statusCode: 404, message: 'User not found.' });

            // Public profiles are accessible
            if (targetUser.isPublic) return next();

            // Check if the requesting user is a follower of the target user
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: targetUser._id,
            });

            if (!isFollower) {
                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. User profile is private.',
                });
            }

            return next();
        }

        // Check if the route is for followers or following lists
        const isFollowersOrFollowingRoute =
            req.originalUrl.includes('/followers') || req.originalUrl.includes('/following');
        if (isFollowersOrFollowingRoute) {
            const targetUser = await UserModel.findById(userId, 'isPublic privacySettings');
            if (!targetUser) return res.status(404).json({ statusCode: 404, message: 'User not found.' });

            // Public profiles allow access to followers and following lists
            if (targetUser.isPublic) return next();

            // Check if the requesting user is a follower of the target user
            const isFollower = await FollowModel.exists({
                follower: requestingUserId,
                following: targetUser._id,
            });

            if (!isFollower) {
                return res.status(403).json({
                    statusCode: 403,
                    message: 'Access denied. Cannot view followers or following list of a private profile.',
                });
            }

            return next();
        }

        // Handle post access
        const post = await PostModel.findById(id).populate('userId', 'isPublic privacySettings');
        if (!post) return res.status(404).json({ statusCode: 404, message: 'Post not found.' });

        const postOwner = post.userId;

        // Public posts are accessible
        if (postOwner.isPublic) return next();

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
    } catch (error) {
        console.error('Privacy Check Error:', error);
        return res.status(500).json({ statusCode: 500, message: 'Server error' });
    }
};

module.exports = { canAccessUser };