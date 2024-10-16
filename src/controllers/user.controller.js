const catchAsync = require("../utils/catchAsync");
const { FollowRequestModel, FollowModel, UserModel } = require("../models");
const pick = require("../utils/pick");
const { UserService, tokenService } = require("../services");
const CONSTANTS = require("../config/constant");
const validator = require("validator")

const createUser = catchAsync(async (req, res) => {
  req.body.userType = "user";
  const user = await UserService.createUser(req.body);
  res.send(user);
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
  if (!userId || !phone) { return res.status(400).json({ message: CONSTANTS.USER_ID_AND_EMAIL_REQUIRED }) }
  const result = await UserService.updateUserPhone(userId, phone);
  if (result.code === CONSTANTS.NOT_FOUND) { return res.status(404).json({ message: CONSTANTS.USER_NOT_FOUND }) }
  res.status(result.code).json({ message: result.message, data: result.data });
});

const deleteUser = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const details = await UserService.deleteUserById(userId);
  if (!details) { return res.status(404).send({ message: CONSTANTS.USER_NOT_FOUND }) }
  res.send(details);
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

const logout = catchAsync(async (req, res) => {
  await UserService.logout(req.body.refreshToken);
  res.send({ data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LOGOUT_MSG });
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await UserService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { emailOrPhone, type } = req.body;
  const result = await UserService.forgotPassword(emailOrPhone, type);
  return res.status(result.code).send(result);
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
  return res.status(result.code).send(result);
});

const resendOTP = catchAsync(async (req, res) => {
  const user = await UserService.resendOTPUsingId(req.body?.userId, req?.body);
  res.send(user);
});


// const verifyMobileOtpToken = catchAsync(async (req, res) => {
//   const { id, otp } = req.body;

//   const { data, code, message } = await tokenService.verifyOtpToken(id, otp);

//   if (code !== 200) {
//     return res.status(code).send({ data: {}, code, message });
//   }
//   await UserService.updateUserById(id, { mobileVerificationStatus: true });
//   if (code == 200) {
//     const tokens = await tokenService.generateAuthTokens(data);
//     if (tokens) {
//       return res.send({ data: { user: data, tokens }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.OTP_VERIFIED });
//     }
//   } else {
//     res.send({ data, code, message });
//   }

//   // res.send({ data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.OTP_VERIFIED });

// });

const changePassword = catchAsync(async (req, res) => {
  var result;
  const { user: userDetails } = await UserService.getUserById(req.user._id);
  if (!userDetails || !(await userDetails.isPasswordMatch(req.body.oldPassword))) { return res.send({ data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.OLD_PASSWORD_MSG }) }
  result = await UserService.updateUserById(req.user._id, req.body);
  if (result) { return res.send({ data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.CHANGE_PASSWORD }) }
});

const getLists = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page", "searchBy", "status", 'type', 'filterDateRange']);
  const result = await UserService.queryUsers(options);
  res.send({ data: result, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIST });
});

const getUserListsToFollow = catchAsync(async (req, res) => {
  if (!req.user || !req.user._id) { return res.status(400).send({ message: 'User not authenticated or missing user ID.' }) }
  const options = pick(req.query, ["sortBy", "limit", "page", "searchBy", "status", 'filterDateRange']);
  const condition = { _id: { $ne: req.user._id }, isDelete: 1, status: 1, type: 'user' };
  const result = await UserService.queryUsersToFollow({ condition, ...options });
  // Prepare the user list with follower status
  const userList = await Promise.all(result.map(async (user) => {
    const isFollowing = await FollowModel.findOne({ follower: req.user._id, following: user._id });
    return { ...user.toObject(), isFollowing: !!isFollowing };
  }));
  res.send({ data: userList, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIST });
});

const getById = catchAsync(async (req, res) => {
  const result = await UserService.getUserById(req.params.id);
  if (!result || !result.user) { return res.send({ data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.NOT_FOUND_MSG }) }
  const { user, followersCount, followingCount } = result;
  const userData = {
    ...user.toObject(),
    id: user._id.toString(),
    profilePhoto: user.profilePhoto ? user.profilePhoto : null,
    followersCount: followersCount,
    followingCount: followingCount,
  };
  delete userData._id;
  res.send({ data: userData, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.DETAILS });
});

const updateById = catchAsync(async (req, res) => {
  const { phone, email, profilePhoto, bio, facebook, instagram, followersCount, followingCount, ...updateBody } = req.body;
  const data = await UserService.updateUserById(req.params.id, {
    ...updateBody,
    phone,
    email,
    bio,
    facebook,
    instagram,
    followersCount,
    followingCount,
  }, req.files);
  if (data.code !== CONSTANTS.SUCCESSFUL) {
    return res.status(data.code || 500).send({ message: data.message });
  }
  const updateMessages = [];
  if (data.phoneUpdated) updateMessages.push("Phone update pending verification. OTP sent to the new phone number.");
  if (data.emailUpdated) updateMessages.push("Email update pending verification. OTP sent to the new email address.");
  const message = updateMessages.length ? updateMessages.join(" ") : "Profile updated successfully.";
  res.send({ data: data.data, message });
});

const deleteById = catchAsync(async (req, res) => {
  var details = await UserService.deleteUserById(req.params.id);
  if (details) {
    res.send(details);
  }
  res.send(details);
});

// const getListWithoutPagination = catchAsync(async (req, res) => {
//   const options = pick(req.query, ['sortBy', 'limit', 'page', 'searchBy', 'status']);
//   const result = await UserService.getListWithoutPagination(options);
//   res.send({ data: result, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LIST });
// });

const followUser = catchAsync(async (req, res) => {
  const { followingId } = req.params;
  const followerId = req.user._id;
  const result = await UserService.followUser(followerId, followingId);
  return res.status(result.code).send({ message: result.message });
});

const unfollowUser = catchAsync(async (req, res) => {
  const { followingId } = req.params;
  const followerId = req.user._id;
  const followRecord = await FollowModel.findOneAndDelete({ follower: followerId, following: followingId });
  if (!followRecord) { return res.status(400).send({ message: CONSTANTS.NOT_FOLLOWING_USER }) }
  await UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
  await UserModel.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } });
  res.status(200).send({ message: CONSTANTS.UNFOLLOWED_SUCCESS });
});

// List of all pending requests of user
const getFollowRequests = catchAsync(async (req, res) => {
  const userId = req.user._id;
  // Extract pagination and search params from query
  const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  // Create filter for searching follower's name or email
  const searchFilter = search
    ? {
      $or: [
        { 'follower.name': { $regex: search, $options: 'i' } }, // Case-insensitive search
        { 'follower.email': { $regex: search, $options: 'i' } },
      ],
    }
    : {};

  // Convert page and limit to numbers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  // Find follow requests with pagination, search, and sorting
  const followRequests = await FollowRequestModel.find({
    following: userId,
    status: 'pending',
    ...searchFilter,
  })
    .populate('follower', 'name email profilePhoto')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber);
  // Get total count of pending follow requests for pagination
  const totalFollowRequests = await FollowRequestModel.countDocuments({
    following: userId,
    status: 'pending',
    ...searchFilter,
  });
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
    code: 200,
    message: CONSTANTS.LIST,
  });
});

const approveFollowRequest = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;
  const followRequest = await FollowRequestModel.findOne({ _id: requestId, following: userId, status: 'pending' });
  if (!followRequest) { return res.status(404).send({ message: CONSTANTS.FOLLOW_ERROR }) }
  followRequest.status = 'approved';
  await followRequest.save();
  const follow = new FollowModel({ follower: followRequest.follower, following: followRequest.following });
  await follow.save();
  await UserModel.findByIdAndUpdate(followRequest.follower, { $inc: { followingCount: 1 } });
  await UserModel.findByIdAndUpdate(followRequest.following, { $inc: { followerCount: 1 } });
  res.status(200).send({ message: CONSTANTS.FOLLOW_REQUEST_APPROVED });
});

const rejectFollowRequest = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user._id;
  const followRequest = await FollowRequestModel.findOne({ _id: requestId, following: userId, status: 'pending' });
  if (!followRequest) { return res.status(404).send({ message: CONSTANTS.FOLLOW_ERROR }) }
  followRequest.status = 'rejected';
  await followRequest.save();
  res.status(200).send({ message: CONSTANTS.FOLLOW_REQUEST_REJECTED });
});

// List of all followers of user
const getFollowers = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, search = '' } = req.query;
  const searchFilter = search
    ? {
      $or: [
        { 'follower.name': { $regex: search, $options: 'i' } },
        { 'follower.email': { $regex: search, $options: 'i' } }
      ]
    }
    : {};
  const followers = await FollowModel.find({ following: userId, ...searchFilter })
    .populate('follower', 'name email profilePhoto')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const totalFollowers = await FollowModel.countDocuments({ following: userId, ...searchFilter });
  res.status(200).send({
    data: {
      docs: followers,
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
    code: 200,
    message: CONSTANTS.LIST
  });
});

// List of all following of user
const getFollowing = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, search = '' } = req.query;
  const searchFilter = search
    ? {
      $or: [
        { 'following.name': { $regex: search, $options: 'i' } },
        { 'following.email': { $regex: search, $options: 'i' } }
      ]
    }
    : {};
  const following = await FollowModel.find({ follower: userId, ...searchFilter })
    .populate('following', 'name email profilePhoto')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  const totalFollowing = await FollowModel.countDocuments({ follower: userId, ...searchFilter });
  res.status(200).send({
    data: {
      docs: following,
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
    code: 200,
    message: CONSTANTS.LIST
  });
});

// Add or Update "About Us" for a partner
const addOrUpdateAboutUs = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const updatedPartner = await UserService.addOrUpdateAboutUs(id, title, description);
  if (!updatedPartner) { return res.status(404).json({ message: 'Partner not found' }) }
  res.status(200).json({ message: 'About Us updated successfully', data: updatedPartner });
});

// Get "About Us" for a partner
const getAboutUs = catchAsync(async (req, res) => {
  const { id } = req.params;
  const partner = await UserService.getAboutUs(id);
  if (!partner) { return res.status(404).json({ message: CONSTANTS.PARTNER_NOT_FOUND_MSG }) }
  res.status(200).json({ data: partner.aboutUs });
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
  getFollowers,
  getFollowing,
  getAboutUs
};