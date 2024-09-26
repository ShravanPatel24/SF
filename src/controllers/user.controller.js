const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const { UserService, tokenService } = require("../services");
const CONSTANT = require("../config/constant");
const validator = require("validator")
const awsS3Service = require('../lib/aws_S3');

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
  if (!user) { res.send({ data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.USER_NOT_FOUND }) }
  res.send({ data: user, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_DETAILS, });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await UserService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const updateUserEmail = catchAsync(async (req, res) => {
  const { userId, email } = req.body;
  if (!userId || !email) { return res.status(400).json({ message: "User ID and email are required." }) }
  const result = await UserService.updateUserEmail(userId, email);
  if (result.code === CONSTANT.NOT_FOUND) { return res.status(404).json({ message: "User not found." }) }
  return res.status(result.code).send(result);
});


const updateUserPhone = catchAsync(async (req, res) => {
  const { userId, phone } = req.body;
  if (!userId || !phone) { return res.status(400).json({ message: "User ID and phone number are required." }) }
  const result = await UserService.updateUserPhone(userId, phone);
  if (result.code === CONSTANT.NOT_FOUND) { return res.status(404).json({ message: "User not found." }) }
  return res.status(result.code).send(result);
});

const deleteUser = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const details = await UserService.deleteUserById(userId);
  if (!details) { return res.status(404).send({ message: 'User not found' }) }
  res.send(details);
});

const login = catchAsync(async (req, res) => {
  try {
    let { emailOrPhone, password, type } = req.body;
    if (!emailOrPhone || typeof emailOrPhone !== 'string') { return res.status(400).send({ data: {}, code: 400, message: 'Email or phone number is required and must be a string.', }) }
    emailOrPhone = validator.isEmail(emailOrPhone)
      ? emailOrPhone.toLowerCase()
      : emailOrPhone;
    const user = await UserService.loginUserWithEmailOrPhoneAndPassword(emailOrPhone, password, type);
    if (user.code === 200) {
      const tokens = await tokenService.generateAuthTokens(user.data);
      if (tokens) { return res.send({ data: { user: user.data, tokens }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_DETAILS }) }
    } else { return res.send(user) }
  } catch (error) {
    console.error("Error in login function:", error);
    return res.status(500).send({ data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: error.message || CONSTANT.INTERNAL_SERVER_ERROR_MSG });
  }
});

const logout = catchAsync(async (req, res) => {
  await UserService.logout(req.body.refreshToken);
  res.send({ data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LOGOUT_MSG });
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
//       return res.send({ data: { user: data, tokens }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.OTP_VERIFIED });
//     }
//   } else {
//     res.send({ data, code, message });
//   }

//   // res.send({ data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.OTP_VERIFIED });

// });

const changePassword = catchAsync(async (req, res) => {
  var result;
  var userDetails = await UserService.getUserById(req.user._id);
  if (!userDetails || !(await userDetails.isPasswordMatch(req.body.oldPassword))) {
    res.send({ data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.OLD_PASSWORD_MSG });
  } else {
    result = await UserService.updateUserById(req.user._id, req.body);
  }
  if (result) {
    res.send({ data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.CHANGE_PASSWORD });
  }
});

const getLists = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page", "searchBy", "status", 'type', 'filterDateRange']);
  const result = await UserService.queryUsers(options);
  res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LIST });
});

const getById = catchAsync(async (req, res) => {
  const data = await UserService.getUserById(req.params.id);
  if (!data) { return res.send({ data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOT_FOUND_MSG }) }
  const userData = {
    ...data.toObject(),
    id: data._id.toString(),
    profilePhoto: data.profilePhoto ? `${req.protocol}://${req.get('host')}/${data.profilePhoto}` : null,
    followersCount: data.followersCount,
    followingCount: data.followingCount,
  };
  delete userData._id;
  res.send({ data: userData, code: CONSTANT.SUCCESSFUL, message: CONSTANT.DETAILS });
});

const updateById = catchAsync(async (req, res) => {
  const { phone, email, profilePhoto, bio, facebook, instagram, followersCount, followingCount, ...updateBody } = req.body;
  let profilePhotoUrl = updateBody.profilePhoto;
  if (req.files && req.files.length > 0) {
    const s3Response = await awsS3Service.uploadProfile(req.files[0], 'profilePictures');
    profilePhotoUrl = s3Response ? s3Response.data.Location : updateBody.profilePhoto;
  }

  const data = await UserService.updateUserById(req.params.id, {
    ...updateBody,
    phone, // Pass the phone to the service for OTP handling
    email, // Pass email to the service for OTP handling
    profilePhoto: profilePhotoUrl,
    bio,
    facebook,
    instagram,
    followersCount,
    followingCount,
  }, req.files);

  const updateMessages = [];
  if (data.phoneUpdated) updateMessages.push("Phone update pending verification. OTP sent to the new phone number.");
  if (data.emailUpdated) updateMessages.push("Email update pending verification. OTP sent to the new email address.");

  const message = updateMessages.length ? updateMessages.join(" ") : "Profile updated successfully.";
  res.send({ data, message });
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
//   res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LIST });
// });

const followUser = catchAsync(async (req, res) => {
  const { targetUserId } = req.body;
  const userId = req.user._id;
  const result = await UserService.followUser(userId, targetUserId);
  if (!result.success) { return res.status(result.status).json({ message: result.message }); }
  return res.status(result.status).json({ message: result.message });
});


const unfollowUser = catchAsync(async (req, res) => {
  const { targetUserId } = req.body;
  const userId = req.user._id;
  const result = await UserService.unfollowUser(userId, targetUserId);
  if (!result.success) { return res.status(result.status).json({ message: result.message }); }
  return res.status(result.status).json({ message: result.message });
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
  getById,
  updateById,
  deleteById,
  followUser,
  unfollowUser
};