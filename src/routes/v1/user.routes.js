const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { basicAuth, userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { userValidation } = require('../../validations');
const { userController } = require('../../controllers');
const { canAccessUser } = require('../../middlewares/privacyCheck');

const router = express.Router();

// Auth routes
router.post('/auth/register', basicAuth(), validate(userValidation.createUser), userController.createUser);
router.post('/auth/login', basicAuth(), validate(userValidation.login), userController.login);
router.post('/auth/logout', basicAuth(), validate(userValidation.logout), userController.logout);
router.post('/auth/refresh-tokens', basicAuth(), validate(userValidation.refreshTokens), userController.refreshTokens);
router.post('/auth/forgot-password', validate(userValidation.forgotPassword), userController.forgotPassword);
router.post('/auth/reset-password', basicAuth(), validate(userValidation.resetPassword), userController.resetPassword);
router.post("/auth/verify-mobile-otp", basicAuth(), userController.verifyMobileOtpToken);
router.post('/auth/resend-otp', basicAuth(), userController.resendOTP);
router.post('/auth/verify-email-otp', basicAuth(), validate(userValidation.verifyEmail), userController.verifyEmailOtp);
router.patch('/auth/:id/about-us', basicAuth(), validate(userValidation.updateAboutUs), userController.addOrUpdateAboutUs);
router.get('/auth/:id/about-us', basicAuth(), validate(userValidation.getAboutUs), userController.getAboutUs);

router.get('/settings/privacy', userAuth(), userController.getPrivacySettings);
router.patch('/settings/privacy', userAuth(), userController.updatePrivacySettings);

// Password routes
router
    .route('/change-password')
    .post(userAuth('changePassword'), validate(userValidation.changePassword), userController.changePassword);

// Profile routes
router
    .route('/profile/:id')
    .patch(userAuth('updateProfile'),
        upload.fields([
            { name: 'profilePhoto', maxCount: 1 },
        ]),
        validate(userValidation.updateUser),
        userController.updateById)
    .get(userAuth('updateProfile'), canAccessUser, userController.getById)
    .delete(userAuth('deleteUser'), userController.deleteUser);
router.delete('/:id/profile-image', userAuth(), userController.deleteProfileImage);

// Routes for updating email and phone without authentication
router.patch('/update-email', userController.updateUserEmail);
router.patch('/update-phone', userController.updateUserPhone);

// Follow and unfollow routes
router.get('/lists', userAuth(), canAccessUser, userController.getUserListsToFollow);
router.post('/follow/:followingId', userAuth('followUser'), userController.followUser);
router.post('/unfollow/:followingId', userAuth('unfollowUser'), userController.unfollowUser);
router.get('/:userId/followers', userAuth(), canAccessUser, userController.getFollowers);
router.get('/:userId/following', userAuth(), canAccessUser, userController.getFollowing);

// Follow Request Approval and Rejection Routes
router.get('/follow-requests', userAuth(), userController.getFollowRequests);
router.post('/follow-requests/:requestId/approve', userAuth('approveFollowRequest'), userController.approveFollowRequest);
router.post('/follow-requests/:requestId/reject', userAuth('rejectFollowRequest'), userController.rejectFollowRequest);


module.exports = router;