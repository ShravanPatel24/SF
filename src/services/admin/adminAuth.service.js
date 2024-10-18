// const httpStatus = require('http-status');
const { AdminModel } = require('../../models');
const CONSTANT = require('../../config/constant');
const Token = require('../../models/token.model');
const { tokenTypes } = require('../../config/tokens');
const tokenService = require('../token.service');
const s3Service = require('../s3.service');
const crypto = require("crypto");
const mailFunctions = require("../../helpers/mailFunctions");

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getAdminById = async (id) => {
  return AdminModel.findById(id);
};

/**
 * Update company by id
 * @param {ObjectId} adminId
 * @param {Object} updateBody
 * @returns {Promise<Company>}
 */

const updateAdminById = async (adminId, updateBody, files) => {
  const admin = await getAdminById(adminId);
  if (!admin) {
    return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.COMPANY_USER_NOT_FOUND };
  }
  if (updateBody.email && (await AdminModel.isEmailTaken(updateBody.email, adminId))) {
    return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.ADMIN_STAFF_EMAIL_ALREADY_EXISTS };
  }
  if (updateBody.phone && (await AdminModel.isMobileTaken(updateBody.phone, adminId))) {
    return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.ADMIN_STAFF_MOBILE_ALREADY_EXISTS };
  }
  var uploadResult;
  if (files && files.length != 0) {
    uploadResult = await s3Service.uploadDocuments(files, 'admin-profile-photo', '');
  }
  if (uploadResult && uploadResult.length != 0) {
    updateBody.profilePhoto = uploadResult[0].key;
  }
  Object.assign(admin, updateBody);
  await admin.save();
  // console.log('update-role-' + adminId, '>>>>>>>>>>>>>>socketEvent');
  // io.emit('update-role-' + adminId, { status: true });
  return { data: admin, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ADMIN_STAFF_UPDATE };
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getAdminByEmail = async (email) => {
  return AdminModel.findOne({ email });
};

const getAdminByPhone = async (phone) => {
  return AdminModel.findOne({ phone });
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailOrPhone = async (emailOrPhone, password, req) => {
  let details;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
  if (isEmail) {
    details = await getAdminByEmail(emailOrPhone);
  } else {
    const isPhone = /^\d{10,}$/.test(emailOrPhone);
    if (isPhone) {
      details = await getAdminByPhone(emailOrPhone);
    } else {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: 'Invalid email or phone format' };
    }
  }
  if (!details || !(await details.isPasswordMatch(password))) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG } }

  const device = req.headers['user-agent'] || 'Unknown Device';
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const ipAddress = req.ip;
  // mailFunctions.sendLoginNotificationEmail(details.email, device, time, ipAddress);
  return { data: details, code: CONSTANT.SUCCESSFUL, message: CONSTANT.LOGIN_MSG };
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const validateUserWithEmail = async (email) => {
  var details;
  details = await getAdminByEmail(email);
  if (details == null) {
    details = await getStaffByEmail(email);
  }
  return details;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOT_FOUND_MSG }
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await getAdminById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG }
  }
};

/**
 * Forgot Password: Generate OTP and send it via email to admin
 * @param {string} email
 * @returns {Promise}
 */
const forgotPassword = async (email) => {
  try {
    const admin = await getAdminByEmail(email);
    if (!admin) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.ADMIN_NOT_FOUND }; }
    const emailOtp = crypto.randomInt(1000, 9999).toString();
    admin.passwordResetEmailOTP = emailOtp;
    admin.otpGeneratedAt = new Date();
    await admin.save();
    await mailFunctions.sendOtpOnMail(admin.email, admin.name || "Admin", emailOtp);
    const resetPasswordToken = await tokenService.generateResetPasswordToken(admin._id);
    return { data: { id: admin._id, token: resetPasswordToken }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.FORGOT_PASSWORD };
  } catch (error) {
    console.error("Error in forgotPassword service:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: "An error occurred during the forgot password process." };
  }
};


/**
 * Verify OTP for password reset
 * @param {string} email
 * @param {string} otp
 * @returns {Promise}
 */
const verifyOtp = async (email, otp) => {
  const admin = await getAdminByEmail(email);
  if (!admin) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.ADMIN_NOT_FOUND } }

  const otpExpiryTime = 15 * 60 * 1000;
  const isOtpValid = admin.passwordResetEmailOTP === otp && (new Date() - admin.otpGeneratedAt) < otpExpiryTime;

  if (!isOtpValid) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: 'Invalid or expired OTP' } }

  admin.passwordResetEmailOTP = undefined;
  admin.otpGeneratedAt = undefined;
  admin.emailOtpVerificationStatus = true;
  await admin.save();

  return { data: { admin }, code: CONSTANT.SUCCESSFUL, message: 'OTP verified successfully' };
};

/**
 * Reset password after verifying OTP
 * @param {string} email
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const admin = await AdminModel.findOne({ _id: resetPasswordTokenDoc.user });

    if (!admin) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.ADMIN_NOT_FOUND } }

    if (!admin.emailOtpVerificationStatus) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.OTP_NOT_VERIFIED } }

    // Check if the new password is the same as the old password
    const isSameAsOldPassword = await admin.isPasswordMatch(newPassword);
    if (isSameAsOldPassword) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.SAME_PASSWORD_ERROR_MSG } }

    // Update the admin's password
    admin.password = newPassword;
    admin.emailOtpVerificationStatus = false;
    await admin.save();

    // Remove the token after successful password reset
    await Token.deleteMany({ user: admin._id, type: tokenTypes.RESET_PASSWORD });
    return { data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.CHANGE_PASSWORD };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.PASSWORD_RESET_FAIL };
  }
};

module.exports = {
  getAdminByEmail,
  getAdminById,
  updateAdminById,
  validateUserWithEmail,
  loginUserWithEmailOrPhone,
  logout,
  refreshAuth,
  forgotPassword,
  verifyOtp,
  resetPassword
};