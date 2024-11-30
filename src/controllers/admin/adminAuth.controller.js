const catchAsync = require('../../utils/catchAsync');
const { adminAuthService, s3Service, UserService } = require('../../services');
const CONSTANTS = require('../../config/constant');

const login = catchAsync(async (req, res) => {
  var { emailOrPhone, password } = req.body;
  const user = await adminAuthService.loginUserWithEmailOrPhone(emailOrPhone, password, req);
  if (user && user.data && user.code === CONSTANTS.SUCCESSFUL) {
    return res.status(CONSTANTS.SUCCESSFUL).send({ data: user.data, statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LOGIN_MSG });
  }
  return res.status(user.code).send(user);
});

const logout = catchAsync(async (req, res) => {
  await adminAuthService.logout(req.body.refreshToken);
  res.send({ data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.LOGOUT_MSG })
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await adminAuthService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  try {
    const { email } = req.body;
    const result = await adminAuthService.forgotPassword(email);

    res.status(result.code).send({
      data: result.data || {},
      statusCode: result.code,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(CONSTANTS.INTERNAL_SERVER_ERROR).send({
      data: {},
      statusCode: CONSTANTS.INTERNAL_SERVER_ERROR,
      message: "Forgot password process failed.",
    });
  }
});

const verifyOtp = catchAsync(async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await adminAuthService.verifyOtp(email, otp);
    res.send(result);
  } catch (error) {
    console.error('Error in verify OTP:', error);
    res.send({ data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: 'OTP verification process failed' });
  }
});

const resetPassword = catchAsync(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await adminAuthService.resetPassword(token, newPassword);
    res.send(result);
  } catch (error) {
    console.error('Error in resetting password:', error);
    res.send({ data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: 'Password reset process failed' });
  }
});

const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(CONSTANTS.BAD_REQUEST).send({
      data: {},
      statusCode: CONSTANTS.BAD_REQUEST,
      message: "Current password and new password are required."
    });
  }

  // Check the user's current password
  const adminDetails = await adminAuthService.getAdminById(req.user._id);
  if (!adminDetails || !(await adminDetails.isPasswordMatch(currentPassword))) {
    return res.status(CONSTANTS.UNAUTHORIZED).send({
      data: {},
      statusCode: CONSTANTS.UNAUTHORIZED,
      message: CONSTANTS.OLD_PASSWORD_MSG
    });
  }

  // Update the password using the new function
  const result = await adminAuthService.updatePasswordById(req.user._id, newPassword);

  return res.status(result.code).send({
    data: result.data,
    statusCode: result.code,
    message: result.message
  });
});

const getLoggedIndUserDetails = catchAsync(async (req, res) => {
  const data = await adminAuthService.getAdminById(req.user._id);
  if (!data) {
    res.send({ data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.ADMIN_STAFF_UPDATE });
  } else {
    res.send({ data: data, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.ADMIN_STAFF_DETAILS });
  }
});

const updateProfile = catchAsync(async (req, res) => {
  var result;

  if (req.user) {
    if (req.files) {
      result = await adminAuthService.updateAdminById(req.user._id, req.body, req.files);
    } else {
      result = await adminAuthService.updateAdminById(req.user._id, req.body, []);
    }
    res.send(result);
  } else {
    res.send({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.ADMIN_NOT_FOUND });
  }
});

const getMedia = catchAsync(async (req, res) => {
  var key = req.query.filename;
  if (key) {
    const data = await s3Service.getUrlS3(key);
    if (data) {
      res.redirect(data.data);
    }
  }
});

// Admin reset password for user or partner
const adminResetUserPassword = catchAsync(async (req, res) => {
  const { emailOrPhone, type } = req.body;
  if (!emailOrPhone || !type) { return res.send({ data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.ADMIN_USER_EMAIL_PHONE_REQUIRED }) }
  const result = await UserService.adminResetPassword(emailOrPhone, type);
  if (result.code !== CONSTANTS.SUCCESSFUL) { return res.send(result) }
  res.send({ data: {}, code: CONSTANTS.SUCCESSFUL, message: `Password reset successful for ${type}. An email with the new password has been sent to ${emailOrPhone}.` });
});

module.exports = {
  login,
  getMedia,
  logout,
  refreshTokens,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  getLoggedIndUserDetails,
  updateProfile,
  adminResetUserPassword
};