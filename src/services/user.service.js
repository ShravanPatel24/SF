const { UserModel, BusinessTypeModel, FollowModel, FollowRequestModel, BankDetailModel, BusinessModel, CartModel, DineOutModel, OrderModel, PostCommentModel, PostLikeModel, PostModel, RoleBaseAccessModel, Token } = require("../models");
const CONSTANTS = require("../config/constant");
const { tokenTypes } = require("../config/tokens");
const tokenService = require("./token.service");
const mailFunctions = require("../helpers/mailFunctions");
const crypto = require("crypto");
const config = require('../config/config');
const moment = require("moment");
var generator = require('generate-password');
const validator = require("validator")
const { s3Service } = require('../services');

/**
 * Admin reset password for user or partner
 * @param {string} emailOrPhone - The email or phone of the user/partner
 * @param {string} type - Type of the user ("user" or "partner")
 * @returns {Promise<Object>}
 */
const adminResetPassword = async (emailOrPhone, type) => {
  try {
    let user;
    if (validator.isEmail(emailOrPhone)) {
      user = await getUserByEmail(emailOrPhone.toLowerCase(), type);
    } else if (validator.isMobilePhone(emailOrPhone)) {
      user = await getUserByPhone(emailOrPhone, type);
    } else {
      return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_INVALID_EMAIL_PHONE };
    }
    if (!user) { return { data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND } }
    const newPassword = generator.generate({ length: 10, numbers: true });
    await updateUserById(user._id, { password: newPassword });
    const userName = user.name || 'User';
    await mailFunctions.sendPasswordResetEmailByAdmin(user.email, userName, newPassword);
    return { data: {}, code: CONSTANTS.SUCCESSFUL, message: `Password reset successful. An email with the new password has been sent to ${user.email}.` };
  } catch (error) {
    console.error("Error in adminResetPassword:", error);
    return { data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: error.message || CONSTANTS.INTERNAL_SERVER_ERROR_MSG };
  }
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (userId) => {
  try {
    const user = await UserModel.findOne({ _id: userId })
      .populate({
        path: 'businessId',
        populate: {
          path: 'businessType',
        },
      });
    if (!user) {
      return {
        statusCode: CONSTANTS.NOT_FOUND,
        message: CONSTANTS.USER_NOT_FOUND
      };
    }
    const followersCount = await FollowModel.countDocuments({ following: userId });
    const followingCount = await FollowModel.countDocuments({ follower: userId });
    return {
      user,
      followersCount,
      followingCount,
      statusCode: CONSTANTS.SUCCESSFUL,
      message: CONSTANTS.DETAILS
    };

  } catch (error) {
    console.error('Error fetching user details:', error);
    return {
      statusCode: CONSTANTS.INTERNAL_SERVER_ERROR,
      message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG
    };
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
    throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG);
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
    throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG);
  }
};

/**
 * Create a User
 * @param {Object} requestBody
 * @returns {Promise<user>}
 */
const createUser = async (requestBody) => {
  // Check if email or phone already exists
  if (requestBody.email && await UserModel.isFieldValueTaken('email', requestBody.email)) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_EMAIL_ALREADY_EXISTS } }
  if (requestBody.phone && await UserModel.isFieldValueTaken('phone', requestBody.phone)) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_PHONE_ALREADY_EXISTS } }

  delete requestBody.confirmPassword;

  if (requestBody.type === "partner") {
    if (!requestBody.businessType) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.BUSINESS_TYPE_REQUIRED } }
    const businessTypeExists = await BusinessTypeModel.findById(requestBody.businessType);
    if (!businessTypeExists) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.INVALID_BUSINESS_TYPE } }
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
  return { data: user, code: 200, message: CONSTANTS.USER_CREATE };
};

const createUserByAdmin = async (requestBody, files) => {
  // Check for email duplication
  if (requestBody.email && (await UserModel.isFieldValueTaken('email', requestBody.email))) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_EMAIL_ALREADY_EXISTS } }

  if (requestBody.phone && (await UserModel.isFieldValueTaken('phone', requestBody.phone))) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_PHONE_ALREADY_EXISTS } }

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
  return { data: user, code: 200, message: CONSTANTS.USER_CREATE };
}

/**
 * Update user's email
 * @param {string} _id - The ID of the user
 * @param {string} newEmail - The new email to update
 * @returns {Promise<Object>}
 */
const updateUserEmail = async (_id, newEmail) => {
  try {
    const user = await UserModel.findById(_id);
    if (!user) { return { code: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND } }
    // Check if the new email matches the current email
    if (user.email === newEmail) { return { code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_EMAIL_SAME_AS_CURRENT } }
    // Check if email is already taken
    const isEmailTaken = await UserModel.isFieldValueTaken('email', newEmail, _id);
    if (isEmailTaken) { return { code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_EMAIL_ALREADY_EXISTS } }
    // Generate email OTP and update user's email
    const emailOtp = crypto.randomInt(1000, 9999).toString();
    user.email = newEmail;
    user.emailOTP = emailOtp;
    user.emailVerificationStatus = false;
    user.isEmailUpdate = true;
    await user.save();
    await mailFunctions.sendOtpOnMail(newEmail, user.name, emailOtp);
    return {
      code: CONSTANTS.SUCCESSFUL,
      message: CONSTANTS.USER_EMAIL_UPDATE,
      data: user
    };
  } catch (error) {
    console.error("Error updating email:", error);
    return { code: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG };
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
    const user = await UserModel.findById(_id);
    if (!user) { return { code: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND } }
    // Check if the new email matches the current email
    if (user.phone === newPhone) { return { code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_PHONE_SAME_AS_CURRENT } }
    // Check if phone is already taken
    const isPhoneTaken = await UserModel.isFieldValueTaken('phone', newPhone, _id);
    if (isPhoneTaken) { return { code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_PHONE_ALREADY_EXISTS } }
    // Generate phone OTP and update user's phone
    const mobileOtp = config.env === 'development' ? '1234' : crypto.randomInt(1000, 9999).toString();
    user.phone = newPhone;
    user.mobileOTP = mobileOtp;
    user.mobileVerificationStatus = false;
    await user.save();
    // Optionally, send OTP via SMS (here mocked)
    // await smsService.sendOtp(newPhone, mobileOtp);
    return {
      code: CONSTANTS.SUCCESSFUL,
      message: CONSTANTS.USER_EMAIL_UPDATE,
      data: user
    };
  } catch (error) {
    console.error("Error updating phone:", error);
    return { code: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG };
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

const queryUsersToFollow = async ({ condition, ...options }) => {
  const query = UserModel.find(condition);
  // Apply pagination, sorting, etc. based on options
  if (options.sortBy) query.sort(options.sortBy);
  if (options.limit) query.limit(options.limit);
  if (options.page) query.skip((options.page - 1) * options.limit);
  const users = await query.exec();
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
      return {
        data: {},
        statusCode: CONSTANTS.NOT_FOUND,
        message: CONSTANTS.USER_NOT_FOUND
      };
    }
    const { phone: newPhone, email: newEmail } = updateBody;

    if (newPhone && user.phone === newPhone) {
      return {
        statusCode: CONSTANTS.BAD_REQUEST,
        message: CONSTANTS.USER_PHONE_SAME_AS_CURRENT
      };
    }

    if (newEmail && user.email === newEmail) {
      return {
        statusCode: CONSTANTS.BAD_REQUEST,
        message: CONSTANTS.USER_EMAIL_SAME_AS_CURRENT
      };
    }

    const previousStatus = user.status;
    let phoneUpdated = false;
    let emailUpdated = false;

    if (newPhone && newPhone !== user.phone) {
      phoneUpdated = await handlePhoneUpdate(updateBody);
    }

    if (newEmail && newEmail !== user.email) {
      emailUpdated = await handleEmailUpdate(updateBody, user);
      await UserModel.findByIdAndUpdate(user._id, { isEmailUpdate: true });
    }

    if (newEmail && await checkIfFieldTaken(newEmail, 'email', _id)) {
      return {
        data: {},
        statusCode: CONSTANTS.BAD_REQUEST,
        message: CONSTANTS.USER_EMAIL_ALREADY_EXISTS
      };
    }

    if (newPhone && await checkIfFieldTaken(newPhone, 'phone', _id)) {
      return {
        data: {},
        statusCode: CONSTANTS.BAD_REQUEST,
        message: CONSTANTS.USER_PHONE_ALREADY_EXISTS
      };
    }

    if (updateBody.countryCode) {
      user.countryCode = updateBody.countryCode;
    }

    const updatedFields = {
      ...updateBody,
      updatedAt: new Date(),
    };

    if (!newPhone) delete updatedFields.phone;
    if (!newEmail) delete updatedFields.email;
    Object.assign(user, updatedFields);

    if (updateBody.socialMediaLinks && Array.isArray(updateBody.socialMediaLinks)) {
      if (updateBody.socialMediaLinks.length > 5) {
        return {
          data: {},
          statusCode: CONSTANTS.BAD_REQUEST,
          message: CONSTANTS.SOCIAL_MEDIA_LINKS_CAPACITY
        };
      }
      user.socialMediaLinks = updateBody.socialMediaLinks;
    }

    await handleImageUploads(user, files);
    await user.save();

    if (previousStatus === 0 && user.status === 1) {
      await mailFunctions.sendActivationEmail(user.email, user.name);
    }

    return {
      data: user,
      phoneUpdated,
      emailUpdated,
      statusCode: CONSTANTS.SUCCESSFUL,
      message: CONSTANTS.USER_UPDATE
    };

  } catch (error) {
    console.error('Error updating user:', error);
    if (error.name === 'ValidationError') {
      return {
        data: {},
        statusCode: CONSTANTS.BAD_REQUEST,
        message: 'Validation failed: ' + error.message
      };
    } else if (error.code === 11000) {
      return {
        data: {},
        statusCode: CONSTANTS.BAD_REQUEST,
        message: 'Duplicate field value: ' + Object.keys(error.keyValue)
      };
    } else {
      return {
        data: {},
        statusCode: CONSTANTS.INTERNAL_SERVER_ERROR,
        message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG
      };
    }
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
const handleEmailUpdate = async (updateBody, user) => {
  const emailOtp = crypto.randomInt(1000, 9999).toString();
  updateBody.emailOTP = emailOtp;
  updateBody.emailVerificationStatus = false;
  await mailFunctions.sendOtpOnMail(updateBody.email, user.name, emailOtp);
  return true;
};

// Helper function to check if field is already taken (email/phone)
const checkIfFieldTaken = async (value, field, excludeId) => {
  return value && await UserModel.isFieldValueTaken(field, value, excludeId);
};

// Helper function to handle profile, banner, and gallery image uploads
const handleImageUploads = async (user, files) => {
  if (files && files['profilePhoto'] && files['profilePhoto'].length > 0) {
    const s3Response = await s3Service.uploadImage(files['profilePhoto'][0], 'profilePictures');
    if (s3Response && s3Response.data) {
      user.profilePhoto = s3Response.data.Key;
    } else {
      throw new Error(CONSTANTS.S3_BUCKET_UPLOAD_FAILED);
    }
  }
};

/**
 * Delete User by id
 * @param {ObjectId} userId
 * @returns {Promise<user>}
 */
const deleteUserById = async (userId) => {
  try {
    const { user } = await getUserById(userId);
    if (!user) { return { data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.USER_NOT_FOUND } }
    await BankDetailModel.deleteMany({ user: userId });
    await BusinessModel.deleteMany({ partner: userId });
    await CartModel.deleteMany({ user: userId });
    await DineOutModel.deleteMany({ user: userId });
    await FollowModel.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
    await FollowRequestModel.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
    await OrderModel.deleteMany({ user: userId });
    await PostCommentModel.deleteMany({ user: userId });
    await PostLikeModel.deleteMany({ user: userId });
    await PostModel.deleteMany({ user: userId });
    await RoleBaseAccessModel.deleteMany({ user: userId });
    await Token.deleteMany({ user: userId });
    // Soft delete the user
    user.isDelete = 0;
    await user.save();
    return { data: user, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.DELETED };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.INTERNAL_SERVER_ERROR_MSG };
  }
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
  if (!refreshTokenDoc) { return { data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.NOT_FOUND_MSG } }
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
  } catch (error) { return { data: {}, code: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.UNAUTHORIZED_MSG } }
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
    if (validator.isEmail(emailOrPhone)) {
      user = await UserModel.findOne({ email: emailOrPhone.toLowerCase(), type });
    } else {
      user = await UserModel.findOne({ phone: emailOrPhone, type });
    }

    if (!user) {
      return { data: {}, code: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.UNAUTHORIZED_MSG };
    }

    const isPasswordValid = await user.isPasswordMatch(password);
    if (!isPasswordValid) {
      return { data: {}, code: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.UNAUTHORIZED_MSG };
    }

    if (!user.mobileVerificationStatus) {
      return { data: { phone: user.phone }, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.MOB_VERIFICATION_REQUIRED_MSG };
    }

    const tokens = await tokenService.generateAuthTokens(user);

    // Check for suspicious login
    const currentIpAddress = req.ip === '::1' ? '127.0.0.1' : req.ip;
    const currentUserAgent = req.headers['user-agent'] || 'Unknown Device';
    const currentTime = new Date();

    let sendLoginNotification = false;

    // Check if this is the first login
    if (!user.lastLogin) {
      user.lastLogin = {
        ipAddress: currentIpAddress,
        userAgent: currentUserAgent,
        timestamp: currentTime
      };
      await user.save(); // Save the last login details
    } else {
      // Compare current login details with the last login
      const { ipAddress, userAgent, timestamp } = user.lastLogin;

      if (ipAddress !== currentIpAddress || userAgent !== currentUserAgent) {
        sendLoginNotification = true; // Send notification for suspicious login
      }

      // Update the last login details
      user.lastLogin = {
        ipAddress: currentIpAddress,
        userAgent: currentUserAgent,
        timestamp: currentTime
      };
      await user.save(); // Save the updated last login details
    }

    // Send login notification if required
    if (sendLoginNotification) {
      const device = req.headers['user-agent'] || 'Unknown Device';
      const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      mailFunctions.sendLoginNotificationEmail(user.email, device, time, currentIpAddress);
    }

    return { data: { user, tokens }, code: CONSTANTS.SUCCESS, message: CONSTANTS.LOGIN_MSG };
  } catch (error) {
    console.error("Error in loginUserWithEmailOrPhoneAndPassword:", error);
    return { data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: error.message || CONSTANTS.INTERNAL_SERVER_ERROR_MSG };
  }
};

const verifyUserEmailOtp = async (id, otp) => {
  try {
    if (typeof otp !== 'number') { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.OTP_STRING_VERIFICATION } }
    const result = await getUserById(id);
    const user = result.user;
    if (!user) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_NOT_FOUND } }

    const currentTime = moment();
    // Check if the email OTP is present
    if (user.emailOTP) {
      const emailOtpCreationTime = moment(user.emailOtpCreatedAt);
      const emailOtpExpirationTime = 14; // Expiration time in minutes
      const emailTimeDifference = currentTime.diff(emailOtpCreationTime, 'seconds');
      const emailOtpExpirationTimeInSeconds = emailOtpExpirationTime * 60;

      if (emailTimeDifference > emailOtpExpirationTimeInSeconds) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.EXPIRE_OTP } }

      // Check if the OTP matches
      if (user.emailOTP === otp) {
        if (user.emailVerificationStatus) { return { data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.USER_ALREADY_VERIFIED } }

        // Update user's verification status and clear OTP
        await updateUserById(id, {
          emailVerificationStatus: true,
          emailOTP: null,
          isVerifyEmailOtp: true,
          emailOtpCreatedAt: null,
        });

        const tokens = await tokenService.generateAuthTokens(user);
        // Only send welcome email if this is not an email update
        if (!user.isEmailUpdate) { await mailFunctions.sendWelcomeEmail(user.email, user.name) }
        // Reset the isEmailUpdate flag after successful verification
        await updateUserById(id, { isEmailUpdate: false });
        return {
          data: {
            user: { ...user.toObject() },
            tokens
          }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.OTP_VERIFIED
        };
      }
    }
    // Check if the OTP is for password reset
    if (user.passwordResetEmailOTP) {
      const passwordResetOtpCreationTime = moment(user.passwordResetEmailOtpCreatedAt);
      const passwordResetOtpExpirationTime = 14; // Expiration time in minutes
      const passwordResetTimeDifference = currentTime.diff(passwordResetOtpCreationTime, 'seconds');
      const passwordResetOtpExpirationTimeInSeconds = passwordResetOtpExpirationTime * 60;

      if (passwordResetTimeDifference > passwordResetOtpExpirationTimeInSeconds) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.EXPIRE_OTP } }
      if (user.passwordResetEmailOTP === otp) {
        await updateUserById(id, {
          isPasswordResetOtpVerified: true,
          passwordResetEmailOTP: null,
          passwordResetEmailOtpCreatedAt: null
        });
        return { data: { user }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.PASSWORD_RESET_OTP_VERIFIED };
      }
    }
    return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.INVALID_OTP };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.USER_EMAIL_VERIFY_FAIL };
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
    if (typeof otp !== 'number') { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.OTP_STRING_VERIFICATION } }
    // Fetch the user, followers, and following count
    const result = await getUserById(_id);
    const user = result.user; // Extract the user object

    if (!user) { return { code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.USER_NOT_FOUND } }

    if (user.mobileOTP === otp) {
      if (user.mobileVerificationStatus === true) { return { data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.USER_ALREADY_VERIFIED } }
      // Update user's verification status and clear OTP
      await updateUserById(_id, {
        mobileVerificationStatus: true,
        isVerifyMobileOtp: true,
        mobileOTP: null // Remove mobile OTP after verification
      });
      const tokens = await tokenService.generateAuthTokens(user);
      return {
        data: {
          user: { ...user.toObject() },
          tokens
        }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.OTP_VERIFIED
      };
    }

    if (user.passwordResetMobileOTP === otp) {
      await updateUserById(_id, {
        isPasswordResetOtpVerified: true,
        passwordResetMobileOTP: null // Clear OTP after verification
      });
      return { data: { user }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.PASSWORD_RESET_OTP_VERIFIED };
    }
    return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.INVALID_OTP };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: CONSTANTS.USER_PHONE_VERIFY_FAIL };
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
    if (!user.isPasswordResetOtpVerified) { return { data: {}, code: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PASSWORD_RESET_OTP_NOT_VERIFIED } }

    const isSameAsOldPassword = await user.isPasswordMatch(newPassword);
    if (isSameAsOldPassword) { return { data: {}, code: CONSTANTS.BAD_REQUEST, message: CONSTANTS.SAME_PASSWORD_ERROR_MSG } }
    await updateUserById(user._id, { password: newPassword, isPasswordResetOtpVerified: false });

    await Token.deleteMany({ user: user._id, type: tokenTypes.RESET_PASSWORD });
    return { data: {}, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.CHANGE_PASSWORD };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { data: {}, code: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PASSWORD_RESET_FAIL };
  }
};

const resendOTPUsingId = async (userId, requestBody) => {
  try {
    const data = await UserModel.findOne({ _id: userId });
    if (!data) { return { data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.INVALID_OTP } }

    if (data.otpAttemptCount >= 4 && moment().isBefore(moment(data.otpBlockedUntil).add(5, 'm'))) { return { data: {}, code: CONSTANTS.TOO_MANY_REQUESTS, message: CONSTANTS.USER_BLOCKED_FOR_5_WRONG } }

    const resendAttemptField = `mobileResendAttempt`;
    const resendBlockedUntilField = `mobileResendBlockedUntil`;
    const blockedFor = `ismobileBlockedFor`;

    if (data[resendAttemptField] >= 3) {
      if (moment().isBefore(moment(data[resendBlockedUntilField]))) {
        return { data: {}, code: CONSTANTS.TOO_MANY_REQUESTS, message: CONSTANTS.RESEND_BLOCK_FOR_24_HOURS };
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

    return { data: data, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.OTP_RESEND };
  } catch (error) {
    return { data: {}, code: CONSTANTS.ERROR_CODE, message: error.message };
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
      return { data: {}, code: CONSTANTS.BAD_REQUEST, message: "Must provide a valid email or phone number." };
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
      return { data: { id: user._id, token: resetPasswordToken }, code: CONSTANTS.SUCCESSFUL, message: CONSTANTS.FORGOT_PASSWORD };
    } else {
      return { data: {}, code: CONSTANTS.NOT_FOUND, message: CONSTANTS.NON_REGISTERED_EMAIL_CHECK };
    }
  } catch (error) {
    console.error("Error in forgotPassword service:", error);
    return { data: {}, code: CONSTANTS.INTERNAL_SERVER_ERROR, message: "An error occurred during the forgot password process." };
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
    if (followerId.toString() === followingId.toString()) { return { code: 400, message: CONSTANTS.FOLLOW_YOURSELF } }
    const followingUser = await UserModel.findById(followingId);
    if (!followingUser) { return { code: 404, message: CONSTANTS.USER_NOT_FOUND } }

    const existingRequest = await FollowRequestModel.findOne({ follower: followerId, following: followingId });
    if (existingRequest) { return { code: 400, message: CONSTANTS.ALREADY_REQUESTED } }

    const followRequest = new FollowRequestModel({ follower: followerId, following: followingId });
    await followRequest.save();
    return { code: 200, message: CONSTANTS.FOLLOW_REQUEST_SENT };
  } catch (error) {
    console.error("Error in followUser:", error);
    return { code: 500, message: CONSTANTS.INTERNAL_SERVER_ERROR };
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
    if (!followRecord) { return { code: 400, message: CONSTANTS.NOT_FOLLOWING_USER } }

    // Decrement following and follower counts
    await UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
    await UserModel.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } });

    return { code: 200, message: CONSTANTS.UNFOLLOWED_SUCCESS };
  } catch (error) {
    console.error("Error in unfollowUser:", error);
    return { code: 500, message: CONSTANTS.NOT_FOLLOWING_USER };
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
  adminResetPassword,
  createUser,
  createUserByAdmin,
  queryUsers,
  queryUsersToFollow,
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