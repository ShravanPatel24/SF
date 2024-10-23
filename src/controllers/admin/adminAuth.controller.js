const catchAsync = require('../../utils/catchAsync');
const { adminAuthService, adminStaffService, s3Service, UserService } = require('../../services');
const CONSTANT = require('../../config/constant');

const login = catchAsync(async (req, res) => {
  var { emailOrPhone, password } = req.body;
  const user = await adminAuthService.loginUserWithEmailOrPhone(emailOrPhone, password, req);
  if (user && user.data && user.code === CONSTANT.SUCCESSFUL) {
    return res.status(CONSTANT.SUCCESSFUL).send({ data: user.data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.LOGIN_MSG });
  }
  return res.status(user.code).send(user);
});

const logout = catchAsync(async (req, res) => {
  await adminAuthService.logout(req.body.refreshToken);
  res.send({ data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LOGOUT_MSG })
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await adminAuthService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  try {
    const { email } = req.body;
    const result = await adminAuthService.forgotPassword(email);
    res.send(result);
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.send({ data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: 'Forgot password process failed' });
  }
});

const verifyOtp = catchAsync(async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await adminAuthService.verifyOtp(email, otp);
    res.send(result);
  } catch (error) {
    console.error('Error in verify OTP:', error);
    res.send({ data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: 'OTP verification process failed' });
  }
});

const resetPassword = catchAsync(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const result = await adminAuthService.resetPassword(token, newPassword);
    res.send(result);
  } catch (error) {
    console.error('Error in resetting password:', error);
    res.send({ data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: 'Password reset process failed' });
  }
});


const changePassword = catchAsync(async (req, res) => {
  var result;
  console.log('req.user===', req.user)
  if (req.user && req.user.type != 'superadmin') {
    var userDetails = await adminStaffService.getAdminStaffUserById(req.user._id);
    if (!userDetails || !(await userDetails.isPasswordMatch(req.body.currentPassword))) {
      // console.log('check if---', userDetails)
      return res.send({ data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.OLD_PASSWORD_MSG })
    } else {
      result = await adminStaffService.updateAdminStaffUserById(req.user._id, req.body);
    }
  } else {
    var adminDetails = await adminAuthService.getAdminById(req.user._id);
    console.log("🚀 ~ file: adminAuth.controller.js:62 ~ changePassword ~ adminDetails:", adminDetails)
    if (!adminDetails || !(await adminDetails.isPasswordMatch(req.body.currentPassword))) {
      return res.send({ data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.OLD_PASSWORD_MSG })
    } else {
      console.log('check else---', req.user._id)
      result = await adminAuthService.updateAdminById(req.user._id, req.body);
    }
  }
  if (result) {
    return res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: CONSTANT.CHANGE_PASSWORD });
  }
});

const getLoggedIndUserDetails = catchAsync(async (req, res) => {
  const data = await adminAuthService.getAdminById(req.user._id);
  if (!data) {
    res.send({ data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ADMIN_STAFF_UPDATE });
  } else {
    res.send({ data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ADMIN_STAFF_DETAILS });
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
    res.send({ code: CONSTANT.BAD_REQUEST, message: CONSTANT.ADMIN_NOT_FOUND });
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
  if (!emailOrPhone || !type) { return res.send({ data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.ADMIN_USER_EMAIL_PHONE_REQUIRED }) }
  const result = await UserService.adminResetPassword(emailOrPhone, type);
  if (result.code !== CONSTANT.SUCCESSFUL) { return res.send(result) }
  res.send({ data: {}, code: CONSTANT.SUCCESSFUL, message: `Password reset successful for ${type}. An email with the new password has been sent to ${emailOrPhone}.` });
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