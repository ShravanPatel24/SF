const { UserModel, BusinessTypeModel } = require("../models");
const CONSTANT = require("../config/constant");
const Token = require("../models/token.model");
const { tokenTypes } = require("../config/tokens");
const tokenService = require("./token.service");
const mailFunctions = require("../helpers/mailFunctions");
const crypto = require("crypto");
const config = require('../config/config');
const moment = require("moment");
var generator = require('generate-password');
const validator = require("validator")
const awsS3Service = require('../lib/aws_S3');

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (userId) => {
  console.log('Looking for user ID:', userId);
  return await UserModel.findOne({ _id: userId })
    .populate('businessId', 'businessName mobile email');
};

/**
 * Get user by email and type
 * @param {string} email
 * @param {string} type
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email, type) => {
  try {
    const user = await UserModel.findOne({ email, type });
    return user;
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw new Error(CONSTANT.INTERNAL_SERVER_ERROR_MSG);
  }
};

/**
 * Get user by phone and type
 * @param {string} phone
 * @param {string} type
 * @returns {Promise<User>}
 */
const getUserByPhone = async (phone, type) => {
  try {
    const user = await UserModel.findOne({ phone, type });
    return user;
  } catch (error) {
    console.error("Error in getUserByPhone:", error);
    throw new Error(CONSTANT.INTERNAL_SERVER_ERROR_MSG);
  }
};

/**
 * Create a User
 * @param {Object} requestBody
 * @returns {Promise<user>}
 */
const createUser = async (requestBody) => {
  // Check if email or phone already exists
  if (requestBody.email && await UserModel.isFieldValueTaken('email', requestBody.email)) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_EMAIL_ALREADY_EXISTS } }
  if (requestBody.phone && await UserModel.isFieldValueTaken('phone', requestBody.phone)) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_PHONE_ALREADY_EXISTS } }

  delete requestBody.confirmPassword;

  if (requestBody.type === "partner") {
    if (!requestBody.businessType) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: "Business type is required for partners" } }
    const businessTypeExists = await BusinessTypeModel.findById(requestBody.businessType);
    if (!businessTypeExists) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: "Invalid business type selected" } }
  }

  const mobileOtp = config.env === 'development' ? '1234' : crypto.randomInt(1000, 9999).toString();
  requestBody['mobileOTP'] = mobileOtp;

  if (requestBody.email) {
    const emailOtp = crypto.randomInt(1000, 9999).toString();
    requestBody['emailOTP'] = emailOtp;
    requestBody['emailOtpCreatedAt'] = new Date();
    await mailFunctions.sendOtpOnMail(requestBody.email, requestBody.name || requestBody.companyName, emailOtp);
  }

  const user = await UserModel.create(requestBody);
  mailFunctions.sendOtpOnMail(user.phone, user.name || user.companyName, mobileOtp);

  return { data: user, code: 200, message: CONSTANT.USER_CREATE };
};

const createUserByAdmin = async (requestBody, files) => {
  // Check for email duplication
  if (requestBody.email && (await UserModel.isFieldValueTaken('email', requestBody.email))) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_EMAIL_ALREADY_EXISTS } }

  if (requestBody.phone && (await UserModel.isFieldValueTaken('phone', requestBody.phone))) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_PHONE_ALREADY_EXISTS } }

  // Upload and update profile photo if files are provided
  // if (files && files.length !== 0) {
  //   const uploadResult = await s3Service.uploadDocuments(files, 'profile-photo', '');
  //   if (uploadResult && uploadResult.length !== 0) {
  //     requestBody.profilePhoto = uploadResult[0].key;
  //   }
  // }
  var password = generator.generate({ length: 10, numbers: true });
  requestBody['isVerifyMobileOtp'] = true;
  requestBody['emailVerificationStatus'] = true;
  requestBody['password'] = password;

  const user = await UserModel.create(requestBody);
  return { data: user, code: 200, message: CONSTANT.USER_CREATE };
}

/**
 * Update user's email
 * @param {string} _id - The ID of the user
 * @param {string} newEmail - The new email to update
 * @returns {Promise<Object>}
 */
const updateUserEmail = async (_id, newEmail) => {
  try {
    const isEmailTaken = await UserModel.isFieldValueTaken('email', newEmail, _id);
    if (isEmailTaken) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_EMAIL_ALREADY_EXISTS } }
    return await updateUserById(_id, { email: newEmail });
  } catch (error) {
    console.error("Error updating email:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: error.message || CONSTANT.INTERNAL_SERVER_ERROR_MSG };
  }
};

/**
 * Update user's phone number
 * @param {string} _id - The ID of the user
 * @param {string} newPhone - The new phone number to update
 * @returns {Promise<Object>}
 */
const updateUserPhone = async (_id, newPhone) => {
  try {
    const isPhoneTaken = await UserModel.isFieldValueTaken('phone', newPhone, _id);
    if (isPhoneTaken) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_PHONE_ALREADY_EXISTS } }
    return await updateUserById(_id, { phone: newPhone });
  } catch (error) {
    console.error("Error updating phone:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: error.message || CONSTANT.INTERNAL_SERVER_ERROR_MSG };
  }
};

/**
 * Query for user
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.searchBy] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (options) => {
  var condition = { $and: [{ isDelete: 1 }] };

  if (options.searchBy && options.searchBy != 'undefined') {
    var searchBy = {
      $regex: ".*" + options.searchBy + ".*",
      $options: "si"  // Case-insensitive search with dot-all mode
    };

    condition.$and.push({
      $or: [
        { name: searchBy },
        { email: searchBy },
        { phone: searchBy }
      ]
    });
  }

  if (options.status && options.status != 'undefined') {
    condition.$and.push({ status: options.status });
  }

  if (options.type && options.type != 'undefined') {
    condition.$and.push({ type: options.type });
  }

  // Date filtering based on filterDateRange
  if (options.filterDateRange) {
    const currentDate = new Date();
    const filterRange = options.filterDateRange.toLowerCase();
    // Handle past 3 and 6 months
    if (filterRange === 'past_3_months') {
      const pastThreeMonths = new Date();
      pastThreeMonths.setMonth(currentDate.getMonth() - 3);  // Subtracting 3 months
      pastThreeMonths.setHours(0, 0, 0, 0); // Reset time to start of the day
      condition.$and.push({
        createdAt: { $gte: pastThreeMonths, $lte: currentDate }
      });
    } else if (filterRange === 'past_6_months') {
      const pastSixMonths = new Date();
      pastSixMonths.setMonth(currentDate.getMonth() - 6);  // Subtracting 6 months
      pastSixMonths.setHours(0, 0, 0, 0); // Reset time to start of the day
      condition.$and.push({
        createdAt: { $gte: pastSixMonths, $lte: currentDate }
      });
    }

    // Handle filtering by specific years (2023 and 2022)
    else if (filterRange === '2023') {
      const startOf2023 = new Date('2023-01-01T00:00:00.000Z');
      const endOf2023 = new Date('2023-12-31T23:59:59.999Z');
      condition.$and.push({
        createdAt: { $gte: startOf2023, $lte: endOf2023 }
      });
    } else if (filterRange === '2022') {
      const startOf2022 = new Date('2022-01-01T00:00:00.000Z');
      const endOf2022 = new Date('2022-12-31T23:59:59.999Z');
      condition.$and.push({
        createdAt: { $gte: startOf2022, $lte: endOf2022 }
      });
    }

    // Handle custom date range
    if (filterRange.includes('-')) {
      const [startDateStr, endDateStr] = filterRange.match(/\d{4}-\d{2}-\d{2}/g);
      // Convert strings to Date objects
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      // Check for invalid dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format in filterDateRange');
      }
      // Set startDate to 00:00:00 and endDate to 23:59:59
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      condition.$and.push({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
    }
  }
  // Sort options
  options["sort"] = { createdAt: -1 };

  // Query database
  const users = await UserModel.paginate(condition, options);
  return users;
};

/**
 * Update user by id
 * @param {string} _id - The user's ID as a string
 * @param {Object} updateBody - The data to update
 * @returns {Promise<Object>}
 */
const updateUserById = async (_id, updateBody, files) => {
  try {
    const user = await UserModel.findById(_id);
    if (!user) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.USER_NOT_FOUND } }

    let phoneUpdated = false;
    let emailUpdated = false;

    if (updateBody.phone && updateBody.phone !== user.phone) {
      const mobileOtp = config.env === 'development' ? '1234' : crypto.randomInt(1000, 9999).toString();
      updateBody.mobileOTP = mobileOtp;
      updateBody.mobileVerificationStatus = false;
      phoneUpdated = true;
      // Send OTP via SMS
      // await sendOtpToPhone(updateBody.phone, mobileOtp);
    }

    if (updateBody.email && updateBody.email !== user.email) {
      const emailOtp = crypto.randomInt(1000, 9999).toString();
      updateBody.emailOTP = emailOtp; // Set the OTP for the email
      updateBody.emailVerificationStatus = false; // Mark as unverified
      emailUpdated = true;
      // Send OTP via email
      // await sendOtpToEmail(updateBody.email, emailOtp);
      await mailFunctions.sendOtpOnMail(updateBody.email, emailOtp);

    }

    if (updateBody.email && updateBody.email !== '' && (await UserModel.isFieldValueTaken('email', updateBody.email, _id))) {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_EMAIL_ALREADY_EXISTS };
    }

    if (updateBody.phone && updateBody.phone !== '' && (await UserModel.isFieldValueTaken('phone', updateBody.phone, _id))) {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_PHONE_ALREADY_EXISTS };
    }

    Object.assign(user, {
      ...updateBody,
      email: updateBody.email && updateBody.email !== '' ? updateBody.email : user.email,
      phone: updateBody.phone && updateBody.phone !== '' ? updateBody.phone : user.phone,
      updatedAt: new Date(),
    });

    if (updateBody.socialMediaLinks && Array.isArray(updateBody.socialMediaLinks)) {
      if (updateBody.socialMediaLinks.length <= 5) {
        user.socialMediaLinks = updateBody.socialMediaLinks;
      } else {
        return { data: {}, code: CONSTANT.BAD_REQUEST, message: 'You can add up to 5 social media links only' };
      }
    }

    // If files were uploaded, upload to AWS S3 instead of local storage
    if (files && files.length > 0) {
      const s3Response = await uploadProfileToS3(files[0], 'profilePictures');
      if (s3Response && s3Response.data) {
        user.profilePhoto = s3Response.data.Location; // Save the S3 URL to the user's profilePhoto field
      } else {
        return { data: {}, code: CONSTANT.BAD_REQUEST, message: 'Failed to upload profile photo to S3' };
      }
    }

    await user.save();
    return { data: user, phoneUpdated, emailUpdated, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_UPDATE };

  } catch (error) {
    console.error("Error updating user:", error);
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: errorMessages.join(', ') };
    }
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: CONSTANT.INTERNAL_SERVER_ERROR_MSG };
  }
};

/**
 * Delete User by id
 * @param {ObjectId} userId
 * @returns {Promise<user>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.USER_NOT_FOUND } }
  user.isDelete = 0;
  await user.save();
  return { data: user, code: CONSTANT.SUCCESSFUL, message: 'User deleted successfully' };
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({
    token: refreshToken,
    type: tokenTypes.REFRESH,
    blacklisted: false,
  });
  if (!refreshTokenDoc) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOT_FOUND_MSG } }
  await refreshTokenDoc.deleteOne();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await getUserById(refreshTokenDoc.user);
    if (!user) { throw new Error() }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG } }
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
// verification of user email
const loginUserWithEmailOrPhoneAndPassword = async (emailOrPhone, password, type) => {
  try {
    let user;
    if (validator.isEmail(emailOrPhone)) {
      user = await UserModel.findOne({ email: emailOrPhone.toLowerCase(), type });
    } else {
      user = await UserModel.findOne({ phone: emailOrPhone, type });
    }

    if (!user) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG } }

    const isPasswordValid = await user.isPasswordMatch(password);
    if (!isPasswordValid) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG } }

    if (!user.mobileVerificationStatus) {
      return { data: { phone: user.phone }, code: CONSTANT.BAD_REQUEST, message: CONSTANT.MOB_VERIFICATION_REQUIRED_MSG }
    }

    const tokens = await tokenService.generateAuthTokens(user);
    return { data: { user, tokens }, code: CONSTANT.SUCCESS, message: CONSTANT.LOGIN_SUCCESS };
  } catch (error) {
    console.error("Error in loginUserWithEmailOrPhoneAndPassword:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: error.message || CONSTANT.INTERNAL_SERVER_ERROR_MSG };
  }
};

const verifyUserEmailOtp = async (id, otp) => {
  try {
    if (typeof otp !== 'number') { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.OTP_STRING_VERIFICATION } }
    const user = await getUserById(id);
    if (!user) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_NOT_FOUND } }

    const currentTime = moment();
    if (user.emailOTP) {
      const emailOtpCreationTime = moment(user.emailOtpCreatedAt); // Email OTP creation time
      const emailOtpExpirationTime = 14; // Expiration time in minutes
      const emailTimeDifference = currentTime.diff(emailOtpCreationTime, 'seconds');
      const emailOtpExpirationTimeInSeconds = emailOtpExpirationTime * 60;

      if (emailTimeDifference > emailOtpExpirationTimeInSeconds) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.EXPIRE_OTP } }

      if (user.emailOTP === otp) {
        if (user.emailVerificationStatus) { return { data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_ALREADY_VERIFIED } }
        await updateUserById(id, {
          emailVerificationStatus: true,
          emailOTP: null,
          isVerifyEmailOtp: true,
          emailOtpCreatedAt: null
        });
        const tokens = await tokenService.generateAuthTokens(user);
        return { data: { user, tokens }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.OTP_VERIFIED };
      }
    }

    if (user.passwordResetEmailOTP) {
      const passwordResetOtpCreationTime = moment(user.passwordResetEmailOtpCreatedAt);
      const passwordResetOtpExpirationTime = 14; // Expiration time in minutes
      const passwordResetTimeDifference = currentTime.diff(passwordResetOtpCreationTime, 'seconds');
      const passwordResetOtpExpirationTimeInSeconds = passwordResetOtpExpirationTime * 60;

      if (passwordResetTimeDifference > passwordResetOtpExpirationTimeInSeconds) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.EXPIRE_OTP } }

      if (user.passwordResetEmailOTP === otp) {
        await updateUserById(id, {
          isPasswordResetOtpVerified: true,
          passwordResetEmailOTP: null,
          passwordResetEmailOtpCreatedAt: null
        });
        return { data: { user }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.PASSWORD_RESET_OTP_VERIFIED };
      }
    }
    return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.INVALID_OTP };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: CONSTANT.USER_EMAIL_VERIFY_FAIL };
  }
};

/**
 * Verify OTP Token
 * @param {ObjectId} _id - The user's ID
 * @param {string} otp - The OTP to verify
 * @returns {Promise<Object>}
 */
const verifyMobileOtpToken = async (_id, otp) => {
  try {
    if (typeof otp !== 'number') { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.OTP_STRING_VERIFICATION } }
    const user = await getUserById(_id);
    if (!user) { return { code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_NOT_FOUND } }
    if (user.mobileOTP === otp) {
      if (user.mobileVerificationStatus === true) { return { data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_ALREADY_VERIFIED } }

      await updateUserById(_id, {
        mobileVerificationStatus: true,
        isVerifyMobileOtp: true,
        mobileOTP: null // Remove email OTP to prevent future use
      });

      const tokens = await tokenService.generateAuthTokens(user);
      return { data: { user, tokens }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.OTP_VERIFIED };
    }

    if (user.passwordResetMobileOTP === otp) {
      await updateUserById(_id, {
        isPasswordResetOtpVerified: true,
        passwordResetMobileOTP: null // Clear OTP after verification
      });
      return { data: { user }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.PASSWORD_RESET_OTP_VERIFIED };
    }
    return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.INVALID_OTP };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: CONSTANT.USER_PHONE_VERIFY_FAIL };
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await UserModel.findOne({ _id: resetPasswordTokenDoc.user });
    if (!user.isPasswordResetOtpVerified) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.PASSWORD_RESET_OTP_NOT_VERIFIED } }

    const isSameAsOldPassword = await user.isPasswordMatch(newPassword);
    if (isSameAsOldPassword) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.SAME_PASSWORD_ERROR_MSG } }
    await updateUserById(user._id, { password: newPassword, isPasswordResetOtpVerified: false });

    await Token.deleteMany({ user: user._id, type: tokenTypes.RESET_PASSWORD });
    return { data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.CHANGE_PASSWORD };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.PASSWORD_RESET_FAIL };
  }
};

const resendOTPUsingId = async (userId, requestBody) => {
  try {
    const data = await UserModel.findOne({ _id: userId });
    if (!data) { return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.INVALID_OTP } }

    if (data.otpAttemptCount >= 4 && moment().isBefore(moment(data.otpBlockedUntil).add(5, 'm'))) { return { data: {}, code: CONSTANT.TOO_MANY_REQUESTS, message: CONSTANT.USER_BLOCKED_FOR_5_WRONG } }

    const resendAttemptField = `mobileResendAttempt`;
    const resendBlockedUntilField = `mobileResendBlockedUntil`;
    const blockedFor = `ismobileBlockedFor`;

    if (data[resendAttemptField] >= 3) {
      if (moment().isBefore(moment(data[resendBlockedUntilField]))) {
        return { data: {}, code: CONSTANT.TOO_MANY_REQUESTS, message: CONSTANT.RESEND_BLOCK_FOR_24_HOURS };
      } else {
        data[resendAttemptField] = 1;
        data[blockedFor] = data[blockedFor] === 2 ? 0 : 1;
      }
    } else {
      data[resendAttemptField] += 1;
      if (moment().isAfter(moment(data[resendBlockedUntilField]).add(5, 'minutes'))) {
        data[resendAttemptField] = 1;
      }
      if (data[resendAttemptField] === 3) {
        data[resendBlockedUntilField] = data[blockedFor] === 2 ? moment().add(24, 'hours').toDate() : moment().add(5, 'minutes').toDate();
        data[blockedFor] = data[blockedFor] === 0 ? 1 : data[blockedFor] === 1 ? 2 : 1;
      } else {
        data[resendBlockedUntilField] = new Date();
      }
    }

    if (requestBody.otpType === 'email') {
      const emailOtp = Math.floor(1000 + Math.random() * 9000).toString();
      data.emailOTP = emailOtp;
      data.emailOtpCreatedAt = new Date();
      await mailFunctions.sendOtpOnMail(data.email, data.name || data.companyName, emailOtp);
    }

    if (requestBody.otpType === 'passwordReset') {
      const passwordResetOtp = Math.floor(1000 + Math.random() * 9000).toString();
      data.passwordResetEmailOTP = passwordResetOtp;
      data.passwordResetEmailOtpCreatedAt = new Date();
      await mailFunctions.sendOtpOnMail(data.email, data.name || data.companyName, passwordResetOtp);
    }
    await data.save();

    return { data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.OTP_RESEND };
  } catch (error) {
    return { data: {}, code: CONSTANT.ERROR_CODE, message: error.message };
  }
};

/**
 * Forgot Password Logic
 * @param {string} emailOrPhone - The email or phone number provided by the user
 * @param {string} type - The type of user (e.g., "user" or "partner")
 * @returns {Promise<Object>}
 */

const forgotPassword = async (emailOrPhone, type) => {
  try {
    let user;
    if (validator.isEmail(emailOrPhone)) {
      user = await getUserByEmail(emailOrPhone.toLowerCase(), type);
    } else if (validator.isMobilePhone(emailOrPhone)) {
      user = await getUserByPhone(emailOrPhone, type);
    } else {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: "Must provide a valid email or phone number." };
    }

    if (user) {
      let otp, updateData = {};
      if (validator.isEmail(emailOrPhone)) {
        otp = crypto.randomInt(1000, 9999).toString();
        updateData = {
          passwordResetEmailOTP: otp,
          passwordResetEmailOtpCreatedAt: new Date()
        };
        await mailFunctions.sendOtpOnMail(user.email, user.name || "User", otp);
      }
      else if (validator.isMobilePhone(emailOrPhone)) {
        otp = config.env === 'development' ? '4321' : crypto.randomInt(1000, 9999).toString();
        updateData = {
          passwordResetMobileOTP: otp,
          passwordResetMobileOtpCreatedAt: new Date()
        };
        // Send mobile OTP via SMS (if enabled)
        // await sendOtpViaSMS(user.phone, otp);
      }
      await updateUserById(user._id, updateData);
      const resetPasswordToken = await tokenService.generateResetPasswordToken(user._id);
      return { data: { id: user._id, token: resetPasswordToken }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.FORGOT_PASSWORD };
    } else {
      return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NON_REGISTERED_EMAIL_CHECK };
    }
  } catch (error) {
    console.error("Error in forgotPassword service:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: "An error occurred during the forgot password process." };
  }
};

const followUser = async (userId, targetUserId) => {
  try {
    const user = await UserModel.findById(userId);
    const targetUser = await UserModel.findById(targetUserId);
    if (!user || !targetUser) { return { success: false, status: 404, message: 'User not found' } }

    if (user.following.includes(targetUserId)) { return { success: false, status: 400, message: `Already following user: ${targetUser.name}` } }

    user.following.push(targetUserId);
    user.followingCount += 1;
    if (!targetUser.followers.includes(userId)) {
      targetUser.followers.push(userId);
      targetUser.followersCount += 1;
    }
    targetUser.followers.push(userId);
    targetUser.followersCount += 1;
    await user.save();
    await targetUser.save();
    return { success: true, status: 200, message: `Successfully followed user: ${targetUser.name}` };
  } catch (error) {
    return { success: false, status: 500, message: 'Internal server error' };
  }
};

const unfollowUser = async (userId, targetUserId) => {
  try {
    const user = await UserModel.findById(userId);
    const targetUser = await UserModel.findById(targetUserId);
    if (!user || !targetUser) { return { success: false, status: 404, message: "User not found" } }
    if (!user.following.includes(targetUserId)) { return { success: false, status: 400, message: "You are not following this user" } }
    user.following = user.following.filter(id => id.toString() !== targetUserId);
    user.followingCount -= 1;
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== userId);
    targetUser.followersCount -= 1;

    await user.save();
    await targetUser.save();
    return { success: true, status: 200, message: `Successfully Unfollowed user: ${targetUser.name}` };
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return { success: false, status: 500, message: "Internal server error" };
  }
};

module.exports = {
  createUser,
  createUserByAdmin,
  queryUsers,
  updateUserById,
  updateUserEmail,
  updateUserPhone,
  deleteUserById,
  getUserById,
  getUserByEmail,
  loginUserWithEmailOrPhoneAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyUserEmailOtp,
  verifyMobileOtpToken,
  resendOTPUsingId,
  getUserByPhone,
  forgotPassword,
  followUser,
  unfollowUser
};