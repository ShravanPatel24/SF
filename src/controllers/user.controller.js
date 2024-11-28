const catchAsync = require("../utils/catchAsync");
const { FollowRequestModel, FollowModel, UserModel } = require("../models");
const pick = require("../utils/pick");
const { UserService, tokenService } = require("../services");
const CONSTANTS = require("../config/constant");
const validator = require("validator")
const { s3Service } = require('../services');

const createUser = catchAsync(async (req, res) => {
  req.body.userType = "user";
  const result = await UserService.createUser(req.body);
  res.status(result.statusCode).send({
    data: result.data,
    statusCode: result.statusCode,
    message: result.message
  });
});

const createUserByAdmin = catchAsync(async (req, res) => {
  req.body.userType = "user";
  const user = await UserService.createUserByAdmin(req.body, req.files);
  res.send(user);
});

const getUser = catchAsync(async (req, res) => {
  const user = await UserService.getUserById(req.params.userId);
  if (!user) { res.send({ data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND }) }
  res.send({ data: user, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.USER_DETAILS, });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await UserService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

// Update user email
const updateUserEmail = catchAsync(async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) { return res.status(400).json({ message: CONSTANTS.USER_ID_AND_EMAIL_REQUIRED }) }
  const result = await UserService.updateUserEmail(userId, email);
  if (result.code === CONSTANTS.NOT_FOUND) { return res.status(404).json({ message: CONSTANTS.USER_NOT_FOUND }) }
  res.status(result.code).json({ message: result.message, data: result.data });
});

// Update user phone
const updateUserPhone = catchAsync(async (req, res) => {
  const { userId, phone } = req.body;
  if (!userId || !phone) { return res.status(400).json({ message: CONSTANTS.USER_ID_AND_PHONE_REQUIRED }) }
  const result = await UserService.updateUserPhone(userId, phone);
  if (result.code === CONSTANTS.NOT_FOUND) { return res.status(404).json({ message: CONSTANTS.USER_NOT_FOUND }) }
  res.status(result.code).json({ message: result.message, data: result.data });
});

const deleteUser = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const details = await UserService.deleteUserById(userId);
  if (details.code === CONSTANTS.NOT_FOUND) { return res.status(404).send({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND }) }
  return res.status(CONSTANTS.SUCCESSFUL).send({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.USER_DELETED, data: details });
});

const login = catchAsync(async (req, res) => {
  try {
    let { emailOrPhone, password, type } = req.body;
    if (!emailOrPhone || typeof emailOrPhone !== 'string') { return res.status(400).send({ data: {}, code: 400, message: 'Email or phone number is required and must be a string.' }) }
    emailOrPhone = validator.isEmail(emailOrPhone) ? emailOrPhone.toLowerCase() : emailOrPhone;
    const user = await UserService.loginUserWithEmailOrPhoneAndPassword(emailOrPhone, password, type, req);
    if (user.code === 200) {
      const tokens = await tokenService.generateAuthTokens(user.data);
      if (tokens) { return res.send({ data: { user: user.data, tokens }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.USER_DETAILS }) }
    } else { return res.send(user) }
  } catch (error) {
    console.error("Error in login function:", error);
    return res.status(500).send({ data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: error.message || CONSTANTS.INTERNAL_SERVER_ERROR_MSG });
  }
});

const deleteProfileImage = catchAsync(async (req, res) => {
  const { id } = req.params;
  try {
    const user = await UserModel.findById(id);
    if (!user) { return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND }) }

    if (!user.profilePhoto) { return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.PROFILE_IMAGE_NOT_FOUND }) }

    const imageKey = user.profilePhoto;
    await s3Service.deleteFromS3([imageKey]);
    user.profilePhoto = null;
    await user.save();

    return res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.PROFILE_IMAGE_DELETED });
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return res.status(CONSTANTS.INTERNAL_SERVER_ERROR).json({ statusCode: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG });
  }
});

const logout = catchAsync(async (req, res) => {
  const result = await UserService.logout(req.body.refreshToken);
  res.send({
    data: result.data,
    statusCode: result.statusCode,
    message: result.message
  });
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await UserService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { emailOrPhone, type } = req.body;
  const result = await UserService.forgotPassword(emailOrPhone, type);
  return res.status(result.statusCode).send(result);
});

const verifyEmailOtp = catchAsync(async (req, res) => {
  const { id, otp } = req.body;
  var response = await UserService.verifyUserEmailOtp(id, otp);
  res.send(response);
});

const verifyMobileOtpToken = catchAsync(async (req, res) => {
  const { id, otp } = req.body;
  var response = await UserService.verifyMobileOtpToken(id, otp);
  res.send(response);
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await UserService.resetPassword(token, newPassword);
  return res.status(result.statusCode).send(result);
});

const resendOTP = catchAsync(async (req, res) => {
  const user = await UserService.resendOTPUsingId(req.body?.userId, req?.body);
  res.status(user.statusCode).send(user);
});

const changePassword = catchAsync(async (req, res) => {
  const { user: userDetails } = await UserService.getUserById(req.user._id);
  if (!userDetails || !(await userDetails.isPasswordMatch(req.body.oldPassword))) {
    return res.send({ data: {}, statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.OLD_PASSWORD_MSG });
  }
  const result = await UserService.updateUserById(req.user._id, req.body);
  if (result) {
    return res.send({ data: {}, statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.CHANGE_PASSWORD });
  }
  return res.status(CONSTANTS.INTERNAL_SERVER_ERROR).send({ data: {}, statusCode: CONSTANTS.INTERNAL_SERVER_ERROR, message: "Password change failed" });
});

const getLists = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page", "searchBy", "status", 'type', 'filterDateRange']);
  try {
    const result = await UserService.queryUsers(options);
    res.status(CONSTANTS.SUCCESSFUL).send({ data: result, statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIST });
  } catch (error) {
    console.error('Error fetching user lists:', error);
    res.status(CONSTANTS.INTERNAL_SERVER_ERROR).send({ statusCode: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG })
  }
});

const getUserListsToFollow = catchAsync(async (req, res) => {
  if (!req.user || !req.user._id) { return res.status(400).send({ message: 'User not authenticated or missing user ID.' }) }
  const options = pick(req.query, ["sortBy", "limit", "page", "searchBy", "status", 'filterDateRange']);
  const condition = { _id: { $ne: req.user._id }, isDelete: 1, status: 1, type: 'user' };
  const result = await UserService.queryUsersToFollow({ condition, ...options });
  const userList = await Promise.all(result.map(async (user) => {
    const isFollowing = await FollowModel.findOne({ follower: req.user._id, following: user._id });
    const userObj = user.toObject();
    userObj.id = userObj._id.toString();
    delete userObj._id;
    return { ...userObj, isFollowing: !!isFollowing };
  }));
  res.send({ data: userList, statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIST });
});

const getById = catchAsync(async (req, res) => {
  const result = await UserService.getUserById(req.params.id);
  if (!result || !result.user) {
    return res.status(CONSTANTS.NOT_FOUND).send({
      data: {},
      statusCode: CONSTANTS.NOT_FOUND,
      message: CONSTANTS.USER_NOT_FOUND,
    });
  }
  const { user, followersCount, followingCount, businessType } = result;
  const userData = {
    ...user.toObject(),
    id: user._id.toString(),
    profilePhoto: user.profilePhoto ? user.profilePhoto : null,
    followersCount,
    followingCount,
    businessType,
  };
  delete userData._id;
  res.status(CONSTANTS.SUCCESSFUL).send({
    data: userData,
    statusCode: CONSTANTS.SUCCESSFUL,
    message: CONSTANTS.DETAILS,
  });
});

const updateById = catchAsync(async (req, res) => {
  const { phone, email, profilePhoto, bio, facebook, instagram, followersCount, followingCount, ...updateBody } = req.body;
  const data = await UserService.updateUserById(
    req.params.id,
    {
      ...updateBody,
      phone,
      email,
      bio,
      facebook,
      instagram,
      followersCount,
      followingCount,
    },
    req.files
  );
  if (data.statusCode !== CONSTANTS.SUCCESSFUL) { return res.status(data.statusCode || 500).send({ statusCode: data.statusCode, message: data.message }) }
  const updateMessages = [];
  if (data.phoneUpdated) updateMessages.push("Phone update pending verification. OTP sent to the new phone number.");
  if (data.emailUpdated) updateMessages.push("Email update pending verification. OTP sent to the new email address.");
  const message = updateMessages.length ? updateMessages.join(" ") : "Profile updated successfully.";
  res.status(data.statusCode).send({ statusCode: data.statusCode, data: data.data, message });
});

const deleteById = catchAsync(async (req, res) => {
  var details = await UserService.deleteUserById(req.params.id);
  if (details) {
    res.send(details);
  }
  res.send(details);
});

const followUser = catchAsync(async (req, res) => {
  const { followingId } = req.params;
  const followerId = req.user._id;
  const result = await UserService.followUser(followerId, followingId);

  return res.status(result.statusCode).json({
    statusCode: result.statusCode,
    message: result.message || "Action completed successfully.", // Fallback message
  });
});

const unfollowUser = catchAsync(async (req, res) => {
  const { followingId } = req.params;
  const followerId = req.user._id;
  const result = await UserService.unfollowUser(followerId, followingId);
  return res.status(result.statusCode).json({
    statusCode: result.statusCode,
    message: result.message
  });
});

// List of all pending requests of user
const getFollowRequests = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const searchFilter = search
    ? { $or: [{ 'follower.name': { $regex: search, $options: 'i' } }, { 'follower.email': { $regex: search, $options: 'i' } }] }
    : {};

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const followRequests = await FollowRequestModel.find({ following: userId, status: 'pending', ...searchFilter })
    .populate('follower', 'name email profilePhoto')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);

  const totalFollowRequests = await FollowRequestModel.countDocuments({ following: userId, status: 'pending', ...searchFilter });
  const totalPages = Math.ceil(totalFollowRequests / limitNumber);
  const hasPrevPage = pageNumber > 1;
  const hasNextPage = pageNumber < totalPages;

  res.status(200).send({
    data: {
      docs: followRequests,
      totalDocs: totalFollowRequests,
      limit: limitNumber,
      totalPages,
      page: pageNumber,
      pagingCounter: (pageNumber - 1) * limitNumber + 1,
      hasPrevPage,
      hasNextPage,
      prevPage: hasPrevPage ? pageNumber - 1 : null,
      nextPage: hasNextPage ? pageNumber + 1 : null,
    },
    statusCode: 200,
    message: CONSTANTS.LIST,
  });
});

const approveFollowRequest = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;
  const followRequest = await FollowRequestModel.findOne({ _id: requestId, following: userId, status: 'pending' });

  if (!followRequest) {
    return res.status(404).send({ statusCode: 404, message: CONSTANTS.FOLLOW_ERROR });
  }

  followRequest.status = 'approved';
  await followRequest.save();

  const follow = new FollowModel({ follower: followRequest.follower, following: followRequest.following });
  await follow.save();

  await UserModel.findByIdAndUpdate(followRequest.follower, { $inc: { followingCount: 1 } });
  await UserModel.findByIdAndUpdate(followRequest.following, { $inc: { followerCount: 1 } });

  res.status(200).send({ statusCode: 200, message: CONSTANTS.FOLLOW_REQUEST_APPROVED });
});

const rejectFollowRequest = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id; // Current logged-in user ID (the one rejecting the request)

  // Find the pending follow request for the logged-in user
  const followRequest = await FollowRequestModel.findOne({ _id: requestId, following: userId, status: 'pending' });

  if (!followRequest) {
    return res.status(404).send({ statusCode: 404, message: CONSTANTS.FOLLOW_ERROR });
  }

  // Delete the follow request
  await FollowRequestModel.deleteOne({ _id: requestId });

  res.status(200).send({ statusCode: 200, message: CONSTANTS.FOLLOW_REQUEST_REJECTED });
});

// List of all followers of personal
const getMyFollowers = catchAsync(async (req, res) => {
  const userId = req.user._id; // Logged-in user's ID from token
  const { page = 1, limit = 10, search = '' } = req.query;

  // Build a search filter
  const searchFilter = search
    ? { name: { $regex: search, $options: 'i' } }
    : {};

  const followers = await FollowModel.find({ following: userId })
    .populate({
      path: 'follower',
      select: 'name profilePhoto',
      match: searchFilter,
    })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Filter out entries where populated `follower` is null
  const filteredFollowers = followers.filter(f => f.follower !== null);

  // Check if the logged-in user is following back each follower
  const formattedData = await Promise.all(
    filteredFollowers.map(async f => {
      const isFollowing = await FollowModel.exists({
        follower: userId,
        following: f.follower._id,
      });

      return {
        _id: f._id,
        user: f.follower,
        isFollowing: !!isFollowing, // True if the logged-in user is following back
      };
    })
  );

  const total = await FollowModel.countDocuments({ following: userId });

  return res.status(200).json({
    statusCode: 200,
    message: 'Followers fetched successfully.',
    data: formattedData,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

// List of all followings of personal
const getMyFollowing = catchAsync(async (req, res) => {
  const userId = req.user._id; // Logged-in user's ID from token
  const { page = 1, limit = 10, search = '' } = req.query;

  // Build a search filter
  const searchFilter = search
    ? { name: { $regex: search, $options: 'i' } }
    : {};

  const following = await FollowModel.find({ follower: userId })
    .populate({
      path: 'following',
      select: 'name profilePhoto',
      match: searchFilter,
    })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Filter out entries where populated `following` is null
  const filteredFollowing = following.filter(f => f.following !== null);

  // Add `isFollowing` flag for each user
  const formattedData = filteredFollowing.map(f => ({
    _id: f._id,
    user: f.following,
    isFollowing: true, // Because these are users the logged-in user is following
  }));

  const total = await FollowModel.countDocuments({ follower: userId });

  return res.status(200).json({
    statusCode: 200,
    message: 'Following list fetched successfully.',
    data: formattedData,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

// List of all followers of user
const getFollowers = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, search = '' } = req.query;

  // Search filter for follower name or email
  const searchFilter = search
    ? {
      $or: [
        { 'follower.name': { $regex: search, $options: 'i' } },
        { 'follower.email': { $regex: search, $options: 'i' } }
      ]
    }
    : {};

  // Fetch followers with pagination
  const followers = await FollowModel.find({ following: userId })
    .populate({
      path: 'follower',
      select: 'name email profilePhoto',
      match: searchFilter // Apply search filter to the populated field
    })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Remove entries where the populated `follower` is null due to search not matching
  const filteredFollowers = followers.filter(f => f.follower !== null);

  // Add `isFollowing` flag for each follower
  const formattedData = await Promise.all(
    filteredFollowers.map(async (f) => {
      const isFollowing = await FollowModel.exists({
        follower: userId,
        following: f.follower._id
      });
      return {
        _id: f._id,
        user: f.follower,
        isFollowing: !!isFollowing // Check if the logged-in user follows back
      };
    })
  );

  // Get total count of followers (without pagination)
  const totalFollowers = await FollowModel.countDocuments({ following: userId });

  res.status(200).send({
    data: {
      docs: formattedData,
      totalDocs: totalFollowers,
      limit: parseInt(limit),
      totalPages: Math.ceil(totalFollowers / limit),
      page: parseInt(page),
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalFollowers / limit),
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < Math.ceil(totalFollowers / limit) ? page + 1 : null
    },
    statusCode: 200,
    message: CONSTANTS.LIST
  });
});

// List of all following of user
const getFollowing = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, search = '' } = req.query;

  // Search filter for following user name or email
  const searchFilter = search
    ? {
      $or: [
        { 'following.name': { $regex: search, $options: 'i' } },
        { 'following.email': { $regex: search, $options: 'i' } }
      ]
    }
    : {};

  // Fetch following users with pagination
  const following = await FollowModel.find({ follower: userId })
    .populate({
      path: 'following',
      select: 'name email profilePhoto',
      match: searchFilter // Apply search filter to the populated field
    })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  // Remove entries where the populated `following` is null due to search not matching
  const filteredFollowing = following.filter(f => f.following !== null);

  // Add `isFollowing` flag for each user (always true for following list)
  const formattedData = filteredFollowing.map((f) => ({
    _id: f._id,
    user: f.following,
    isFollowing: true // Since these are users the logged-in user is already following
  }));

  // Get total count of following users (without pagination)
  const totalFollowing = await FollowModel.countDocuments({ follower: userId });

  res.status(200).send({
    data: {
      docs: formattedData,
      totalDocs: totalFollowing,
      limit: parseInt(limit),
      totalPages: Math.ceil(totalFollowing / limit),
      page: parseInt(page),
      pagingCounter: (page - 1) * limit + 1,
      hasPrevPage: page > 1,
      hasNextPage: page < Math.ceil(totalFollowing / limit),
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < Math.ceil(totalFollowing / limit) ? page + 1 : null
    },
    statusCode: 200,
    message: CONSTANTS.LIST
  });
});

// Add or Update "About Us" for a partner
const addOrUpdateAboutUs = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Title and description are required'
      });
    }
    const updatedPartner = await UserService.addOrUpdateAboutUs(id, title, description);
    if (!updatedPartner) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Partner not found'
      });
    }
    res.status(200).json({
      statusCode: 200,
      message: 'About Us updated successfully',
      data: updatedPartner.aboutUs
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: 'An error occurred while updating About Us', error: error.message });
  }
});

// Get "About Us" for a partner
const getAboutUs = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await UserService.getAboutUs(id);
    if (!partner) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Partner not found'
      });
    }
    if (!partner.aboutUs || !partner.aboutUs.title || !partner.aboutUs.description) {
      return res.status(404).json({
        statusCode: 404,
        message: 'About Us information not available for this partner'
      });
    }
    res.status(200).json({
      statusCode: 200,
      data: partner.aboutUs
    });
  } catch (error) {
    res.status(500).json({ statusCode: 500, message: 'An error occurred while fetching About Us', error: error.message });
  }
});

// Setting Screen
const getPrivacySettings = catchAsync(async (req, res) => {
  try {
    const userId = req.user._id; // Extract userId from middleware
    const user = await UserService.getPrivacySettings(userId);
    res.status(200).json({
      statusCode: 200,
      message: 'Privacy settings retrieved successfully',
      data: user,
    });
  } catch (error) {
    res.status(404).json({ statusCode: 404, message: error.message });
  }
});

const updatePrivacySettings = catchAsync(async (req, res) => {
  try {
    const userId = req.user._id; // Extract userId from middleware
    const { isPublic, privacySettings } = req.body;

    // Ensure at least one field is being updated
    if (!req.body.hasOwnProperty('isPublic') && !privacySettings) {
      return res.status(400).json({ statusCode: 400, message: 'Nothing to update' });
    }

    const updates = {};
    if (req.body.hasOwnProperty('isPublic')) updates.isPublic = isPublic;
    if (privacySettings) {
      updates.privacySettings = { ...privacySettings };
    }

    const updatedUser = await UserModel.findByIdAndUpdate(userId, updates, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ statusCode: 404, message: 'User not found' });
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Privacy settings updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update Privacy Settings Error: ", error); // Log the error
    res.status(500).json({ statusCode: 500, message: "Server error", error });
  }

});

module.exports = {
  verifyMobileOtpToken,
  resendOTP,
  createUser,
  createUserByAdmin,
  getUser,
  updateUser,
  updateUserEmail,
  updateUserPhone,
  deleteUser,
  deleteProfileImage,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  changePassword,
  resetPassword,
  verifyEmailOtp,
  getLists,
  getUserListsToFollow,
  getById,
  updateById,
  deleteById,
  addOrUpdateAboutUs,
  followUser,
  unfollowUser,
  getFollowRequests,
  approveFollowRequest,
  rejectFollowRequest,
  getMyFollowers,
  getMyFollowing,
  getFollowers,
  getFollowing,
  getAboutUs,
  getPrivacySettings,
  updatePrivacySettings
};