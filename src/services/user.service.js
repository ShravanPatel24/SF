const { UserModel, BusinessTypeModel, FollowModel } = require("../models");
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
  try {
    const user = await UserModel.findOne({ _id: userId })
      .populate('businessId', 'businessName mobile email');
    const followersCount = await FollowModel.countDocuments({ following: userId });
    const followingCount = await FollowModel.countDocuments({ follower: userId });
    return { user, followersCount, followingCount };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw new Error('Internal Server Error');
  }
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
    if (!user) {
      return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.USER_NOT_FOUND };
    }

    const previousStatus = user.status;
    let phoneUpdated = false;
    let emailUpdated = false;

    // Handle phone update and OTP
    if (updateBody.phone && updateBody.phone !== user.phone) {
      phoneUpdated = await handlePhoneUpdate(updateBody);
    }

    // Handle email update and OTP
    if (updateBody.email && updateBody.email !== user.email) {
      emailUpdated = await handleEmailUpdate(updateBody);
    }

    // Validate unique email and phone if needed
    if (await checkIfFieldTaken(updateBody.email, 'email', _id)) {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_EMAIL_ALREADY_EXISTS };
    }
    if (await checkIfFieldTaken(updateBody.phone, 'phone', _id)) {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_PHONE_ALREADY_EXISTS };
    }

    // Handle the assignment of updateBody fields
    Object.assign(user, {
      ...updateBody,
      email: updateBody.email || user.email,
      phone: updateBody.phone || user.phone,
      updatedAt: new Date(),
    });

    // Handle social media links validation
    if (updateBody.socialMediaLinks && Array.isArray(updateBody.socialMediaLinks)) {
      if (updateBody.socialMediaLinks.length > 5) {
        return { data: {}, code: CONSTANT.BAD_REQUEST, message: 'You can add up to 5 social media links only' };
      }
      user.socialMediaLinks = updateBody.socialMediaLinks;
    }

    // Upload images: profile photo, banner images, and gallery images
    await handleImageUploads(user, files);

    await user.save();

    // Handle activation email
    if (previousStatus === 0 && user.status === 1) {
      await mailFunctions.sendActivationEmail(user.email, user.name);
    }

    return { data: user, phoneUpdated, emailUpdated, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_UPDATE };

  } catch (error) {
    console.error('Error updating user:', error);
    return handleServiceError(error);
  }
};

// Helper function to handle phone update and OTP
const handlePhoneUpdate = async (updateBody) => {
  const mobileOtp = config.env === 'development' ? '1234' : crypto.randomInt(1000, 9999).toString();
  updateBody.mobileOTP = mobileOtp;
  updateBody.mobileVerificationStatus = false;
  // Send OTP via SMS here if needed
  return true;
};

// Helper function to handle email update and OTP
const handleEmailUpdate = async (updateBody) => {
  const emailOtp = crypto.randomInt(1000, 9999).toString();
  updateBody.emailOTP = emailOtp;
  updateBody.emailVerificationStatus = false;
  await mailFunctions.sendOtpOnMail(updateBody.email, emailOtp);
  return true;
};

// Helper function to check if field is already taken (email/phone)
const checkIfFieldTaken = async (value, field, excludeId) => {
  return value && await UserModel.isFieldValueTaken(field, value, excludeId);
};

// Helper function to handle profile, banner, and gallery image uploads
const handleImageUploads = async (user, files) => {
  if (files && files['profilePhoto'] && files['profilePhoto'].length > 0) {
    const s3Response = await awsS3Service.uploadProfile(files['profilePhoto'][0], 'profilePictures');
    if (s3Response && s3Response.data) {
      user.profilePhoto = s3Response.data.Location;
    } else {
      throw new Error('Failed to upload profile photo to S3');
    }
  }

  // if (files && files['bannerImages'] && files['bannerImages'].length > 0) {
  //   const bannerUploadResponse = await awsS3Service.uploadDocuments(files['bannerImages'], 'profileBanners');
  //   const bannerImageUrls = bannerUploadResponse.map(file => file.location);
  //   user.bannerImages = bannerImageUrls;
  // }

  // if (files && files['galleryImages'] && files['galleryImages'].length > 0) {
  //   const galleryUploadResponse = await awsS3Service.uploadDocuments(files['galleryImages'], 'profileGallery');
  //   const galleryImageUrls = galleryUploadResponse.map(file => file.location);
  //   user.galleryImages = galleryImageUrls;
  // }
};

// Handle service errors
const handleServiceError = (error) => {
  if (error.name === 'ValidationError') {
    const errorMessages = Object.values(error.errors).map(err => err.message);
    return { data: {}, code: CONSTANT.BAD_REQUEST, message: errorMessages.join(', ') };
  }
  return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: CONSTANT.INTERNAL_SERVER_ERROR_MSG };
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
const loginUserWithEmailOrPhoneAndPassword = async (emailOrPhone, password, type, req) => {
  try {
    let user;
    if (validator.isEmail(emailOrPhone)) { user = await UserModel.findOne({ email: emailOrPhone.toLowerCase(), type }) } else { user = await UserModel.findOne({ phone: emailOrPhone, type }) }
    if (!user) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG } }

    const isPasswordValid = await user.isPasswordMatch(password);
    if (!isPasswordValid) { return { data: {}, code: CONSTANT.UNAUTHORIZED, message: CONSTANT.UNAUTHORIZED_MSG } }

    if (!user.mobileVerificationStatus) { return { data: { phone: user.phone }, code: CONSTANT.BAD_REQUEST, message: CONSTANT.MOB_VERIFICATION_REQUIRED_MSG } }

    const tokens = await tokenService.generateAuthTokens(user);

    const device = req.headers['user-agent'] || 'Unknown Device';
    const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ipAddress = req.ip;
    // mailFunctions.sendLoginNotificationEmail(user.email, device, time, ipAddress);

    return { data: { user, tokens }, code: CONSTANT.SUCCESS, message: CONSTANT.LOGIN_SUCCESS };
  } catch (error) {
    console.error("Error in loginUserWithEmailOrPhoneAndPassword:", error);
    return { data: {}, code: CONSTANT.INTERNAL_SERVER_ERROR, message: error.message || CONSTANT.INTERNAL_SERVER_ERROR_MSG };
  }
};

const verifyUserEmailOtp = async (id, otp) => {
  try {
    if (typeof otp !== 'number') {
      return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.OTP_STRING_VERIFICATION };
    }
    const result = await getUserById(id);
    const user = result.user;
    if (!user) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_NOT_FOUND } }

    const currentTime = moment();
    // Check if the email OTP is present
    if (user.emailOTP) {
      const emailOtpCreationTime = moment(user.emailOtpCreatedAt); // Email OTP creation time
      const emailOtpExpirationTime = 14; // Expiration time in minutes
      const emailTimeDifference = currentTime.diff(emailOtpCreationTime, 'seconds');
      const emailOtpExpirationTimeInSeconds = emailOtpExpirationTime * 60;
      if (emailTimeDifference > emailOtpExpirationTimeInSeconds) { return { data: {}, code: CONSTANT.BAD_REQUEST, message: CONSTANT.EXPIRE_OTP } }
      // Check if the OTP matches
      if (user.emailOTP === otp) {
        if (user.emailVerificationStatus) { return { data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_ALREADY_VERIFIED } }
        // Update user's verification status and clear OTP
        await updateUserById(id, {
          emailVerificationStatus: true,
          emailOTP: null,
          isVerifyEmailOtp: true,
          emailOtpCreatedAt: null
        });
        const tokens = await tokenService.generateAuthTokens(user);
        await mailFunctions.sendWelcomeEmail(user.email, user.name);
        return { data: { user, tokens }, code: CONSTANT.SUCCESSFUL, message: CONSTANT.OTP_VERIFIED };
      }
    }
    // Check if the OTP is for password reset
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
    // Fetch the user, followers, and following count
    const result = await getUserById(_id);
    const user = result.user; // Extract the user object

    if (!user) { return { code: CONSTANT.BAD_REQUEST, message: CONSTANT.USER_NOT_FOUND } }

    if (user.mobileOTP === otp) {
      if (user.mobileVerificationStatus === true) { return { data: {}, code: CONSTANT.SUCCESSFUL, message: CONSTANT.USER_ALREADY_VERIFIED } }
      // Update user's verification status and clear OTP
      await updateUserById(_id, {
        mobileVerificationStatus: true,
        isVerifyMobileOtp: true,
        mobileOTP: null // Remove mobile OTP after verification
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

/**
 * Follow a user
 * @param {ObjectId} followerId - The ID of the user following
 * @param {ObjectId} followingId - The ID of the user being followed
 * @returns {Promise<Object>}
 */
const followUser = async (followerId, followingId) => {
  try {
    if (followerId.toString() === followingId.toString()) { return { code: 400, message: "You cannot follow yourself" } }
    const followingUser = await UserModel.findById(followingId);
    // Check if the following user is a partner
    if (!followingUser) { return { code: 404, message: "User to follow not found" } }

    if (followingUser.type === "partner") { return { code: 400, message: "You cannot follow a partner" } }

    const existingFollow = await FollowModel.findOne({ follower: followerId, following: followingId });
    if (existingFollow) { return { code: 400, message: "You are already following this user" } }

    // Create the follow relationship
    const follow = new FollowModel({ follower: followerId, following: followingId });
    await follow.save();

    // Increment follower and following counts
    await UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
    await UserModel.findByIdAndUpdate(followingId, { $inc: { followerCount: 1 } });
    return { code: 200, message: "Followed successfully" };
  } catch (error) {
    console.error("Error in followUser:", error);
    return { code: 500, message: "Internal server error" };
  }
};

/**
 * Unfollow a user
 * @param {ObjectId} followerId - The ID of the user unfollowing
 * @param {ObjectId} followingId - The ID of the user being unfollowed
 * @returns {Promise<Object>}
 */
const unfollowUser = async (followerId, followingId) => {
  try {
    const followRecord = await FollowModel.findOneAndDelete({ follower: followerId, following: followingId });
    if (!followRecord) {
      return { code: 400, message: "You are not following this user" };
    }

    // Decrement following and follower counts
    await UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    await UserModel.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } });

    return { code: 200, message: "Unfollowed successfully" };
  } catch (error) {
    console.error("Error in unfollowUser:", error);
    return { code: 500, message: "Internal server error" };
  }
};

// Add or update "About Us" information
const addOrUpdateAboutUs = async (userId, title, description) => {
  const updatedPartner = await UserModel.findByIdAndUpdate(userId, { aboutUs: { title, description } }, { new: true, runValidators: true });
  return updatedPartner;
};

// Get "About Us" information
const getAboutUs = async (userId) => {
  const partner = await UserModel.findById(userId, 'aboutUs');
  return partner;
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
  unfollowUser,
  addOrUpdateAboutUs,
  getAboutUs
};