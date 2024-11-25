const { UserModel, FollowModel, PostModel } = require('../models');

/**
 * Middleware to check if the current user can access a target user's data or posts.
 */
const canAccessUser = async (req, res, next) => {
    try {
        const { id, userId } = req.params; // `id` might be postId, `userId` might be a target user
        const requestingUserId = req.user?._id; // User making the request

        // Check if this is a request for a post
        if (id) {
            console.log('Request for Post ID:', id);

            const post = await PostModel.findById(id).populate('userId', 'isPublic privacySettings');
            if (!post) {
                console.log('Post not found for ID:', id);
                return res.status(404).json({ statusCode: 404, message: 'Post not found.' });
            }

            const postOwner = post.userId;

            if (postOwner.isPublic) {
                console.log('Post is public; access granted.');
                return next(); // Public posts are accessible to all
            }

            // Check if the requesting user follows the post owner
            const isFollower = await FollowModel.exists({ follower: requestingUserId, following: postOwner._id });
            if (!isFollower) {
                console.log('Requesting user is not a follower; access denied.');
                return res.status(403).json({
                    statusCode: 403,
                    message: 'You are not allowed to access this post due to privacy settings.',
                });
            }

            console.log('Follower check passed; access granted.');
            return next(); // Access granted
        }

        // Check if this is a request for a user
        if (userId) {
            console.log('Request for User ID:', userId);

            const targetUser = await UserModel.findById(userId, 'isPublic privacySettings');
            if (!targetUser) {
                console.log('User not found for ID:', userId);
                return res.status(404).json({ statusCode: 404, message: 'User not found.' });
            }

            if (targetUser.isPublic) {
                console.log('User profile is public; access granted.');
                return next(); // Public profiles are accessible to all
            }

            // Check if the requesting user follows the target user
            const isFollower = await FollowModel.exists({ follower: requestingUserId, following: targetUser._id });
            if (!isFollower) {
                console.log('Requesting user is not a follower; access denied.');
                return res.status(403).json({
                    statusCode: 403,
                    message: 'You are not allowed to access this user\'s data due to privacy settings.',
                });
            }

            console.log('Follower check passed; access granted.');
            return next(); // Access granted
        }

        // If neither postId nor userId is provided, reject the request
        return res.status(400).json({
            statusCode: 400,
            message: 'Invalid request. No valid postId or userId provided.',
        });
    } catch (error) {
        console.error('Privacy Check Error:', error);
        res.status(500).json({ statusCode: 500, message: 'Server error', error });
    }
};

module.exports = { canAccessUser };