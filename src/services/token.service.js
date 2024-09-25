const jwt = require("jsonwebtoken");
const moment = require("moment");
const config = require("../config/config");
const { Token, UserModel } = require("../models");
const ApiError = require("../utils/ApiError");
const { tokenTypes } = require("../config/tokens");
const crypto = require("crypto");
 
/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} [secret]
 * @returns {string}
 */
 
const generateOtpToken = async (partnerId) => {
  // Generate 4-digit OTP
  const otp = crypto.randomInt(1000, 9999).toString(); // Generates 4-digit OTP
 
 
  // Set OTP expiry (e.g., 10 minutes)
  const expires = moment().add(10, "minutes");
 
  // Save OTP token in the database
  const tokenDoc = await Token.create({
    token: otp, // Store the OTP
    user: partnerId,
    type: tokenTypes.MOBILE_VERIFICATION,
    expires: expires.toDate(),
    blacklisted: false,
  });
 
  return { otp, tokenDoc };
};
 
const verifyOtpToken = async (_id, otp) => {
  // Use _id to indicate MongoDB ObjectId
  try {
    const tokenDoc = await UserModel.findOne({ mobileOTP: otp, _id: _id });
 
    if (!tokenDoc) {
      console.error("Invalid or expired OTP");
      return { code: 400, message: "Invalid or expired OTP" };
    }
 
    console.log("OTP:", otp);
    console.log("Token Document:", tokenDoc);
 
    const currentTime = moment();
    if (moment(tokenDoc.expires).isBefore(currentTime)) {
      console.error("OTP has expired");
      return { data: {}, code: 400, message: "OTP has expired" };
    }
 
    // Mark isVerifyMobileOtp as true in the database
    tokenDoc.isVerifyMobileOtp = true;
    await tokenDoc.save();
 
    return { data: tokenDoc, code: 200, message: "OTP verified successfully" };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { code: 500, message: "Internal server error" };
  }
};
 
 
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};
 
/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  try {
    const tokenDoc = await Token.create({
      token,
      user: userId,
      expires: expires.toDate(),
      type,
      blacklisted,
    });
 
    console.log("Token Expires:", expires.toDate());
    console.log("Generated Token:", token);
 
    return tokenDoc;
  } catch (error) {
    console.error("Error saving token:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Error saving token");
  }
};
 
/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenDoc = await Token.findOne({
      token,
      user: payload.sub,
      type,
      blacklisted: false,
    });
 
    if (!tokenDoc) {
      throw new Error("Token not found or blacklisted.");
    }
    return tokenDoc;
  } catch (error) {
    console.error("Error verifying token:", error);
    throw new Error("Invalid or expired token.");
  }
};
 
const deleteToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  const tokenDoc = await Token.findOneAndDelete({
    token,
    type,
    user: payload.sub,
    blacklisted: false,
  });
  if (!tokenDoc) {
    throw new Error("Token not found");
  }
  return tokenDoc;
};
 
/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(
    config.jwt.accessExpirationMinutes,
    "minutes"
  );
  const accessToken = generateToken(
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS
  );
 
  const refreshTokenExpires = moment().add(
    config.jwt.refreshExpirationDays,
    "days"
  );
  const refreshToken = generateToken(
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH
  );

  await saveToken(
    accessToken,
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS
  );
  
  await saveToken(
    refreshToken,
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH
  );
 
  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};
 
/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (company) => {
  const expires = moment().add(
    config.jwt.resetPasswordExpirationMinutes,
    "minutes"
  );
  const resetPasswordToken = generateToken(
    company._id,
    expires,
    tokenTypes.RESET_PASSWORD
  );
  await saveToken(
    resetPasswordToken,
    company._id,
    expires,
    tokenTypes.RESET_PASSWORD
  );
  return resetPasswordToken;
};
 
const generateEmailOtpToken = async (userId) => {
  const otp = crypto.randomInt(1000, 9999).toString();
  const expires = moment().add(10, "minutes");
 
  // Save the OTP in the Token collection with the EMAIL_VERIFICATION type
  const tokenDoc = await Token.create({
    token: otp, // Store the OTP
    user: userId,
    type: tokenTypes.EMAIL_VERIFICATION,
    expires: expires.toDate(),
    blacklisted: false,
  });
 
  return { otp, tokenDoc };
};
 
module.exports = {
  generateOtpToken,
  verifyOtpToken,
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateEmailOtpToken,
  deleteToken,
};
 
 