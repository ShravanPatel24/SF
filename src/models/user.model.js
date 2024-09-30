const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { toJSON } = require("./plugins");
const mongoosePaginate = require("mongoose-paginate-v2");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: {
      type: String,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email address"]
    },
    registerBy: {
      type: String,
      enum: ['Web', 'Android', 'IOS'],
    },
    // New fields for country code and phone
    countryCode: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\+\d{1,4}$/.test(v); // Ensure the country code starts with '+' and has 1 to 4 digits
        },
        message: props => `${props.value} is not a valid country code!`
      },
      example: "+1"
    },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    mobileOTP: Number,
    emailOTP: Number,
    emailOtpCreatedAt: { type: Date },
    passwordResetEmailOtpCreatedAt: { type: Date },
    profilePhoto: String,
    bio: { type: String, default: "" },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    socialMediaLinks: {
      type: [String],
      validate: [arrayLimit, 'You can add up to 5 social media links only'],
    },
    isVerifyMobileOtp: { type: Boolean, default: false },
    mobileVerificationStatus: { type: Boolean, default: false },
    isVerifyEmailOtp: { type: Boolean, default: false },
    emailVerificationStatus: { type: Boolean, default: false },
    passwordResetEmailOTP: Number,
    passwordResetMobileOTP: Number,
    isPasswordResetOtpVerified: { type: Boolean, default: false },
    type: { type: String, enum: ["user", "partner"], default: "user" },
    mobileResendAttempt: { type: Number, default: 0 },
    mobileResendBlockedUntil: Date,
    ismobileBlockedFor: { type: Number, default: 0 }, // 0 For not blocked, 1 For 5 mint and 2 For 24 hours.
    otpAttemptCount: { type: Number, default: 0 },
    otpBlockedUntil: Date,
    // Business-related fields for partners
    businessType: { type: mongoose.Schema.Types.ObjectId, ref: 'businessType' },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    aboutUs: {
      title: { type: String, required: false },
      description: { type: String, required: false }
    },
    language: {
      type: String,
      enum: [
        "Arabic",
        "English",
        "French",
        "Spanish",
        "German",
        "Chinese",
        "Hindi",
        "Russian",
        "Urdu",
      ],
      default: "English",
    },
    status: { type: Number, default: 1 }, //0 is Inactive, 1 is Active
    isDelete: { type: Number, default: 1 } //0 is delete, 1 is Active
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(mongoosePaginate);

function arrayLimit(val) {
  return val.length <= 5; // Limit to 5 social media links
}

userSchema.statics.isFieldValueTaken = async function (fieldName, value, excludeId) {
  const query = { [fieldName]: value };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const data = await this.findOne(query);
  return !!data;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */

userSchema.methods.isPasswordMatch = async function (password) {
  try {
    const isMatch = await bcrypt.compare(password, this.password);
    return isMatch;
  } catch (error) {
    throw error;
  }
};

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await bcrypt.hash(this.password, 8);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

userSchema.pre("save", function (next) {
  const fullPhoneNumber = `${this.countryCode}${this.phone}`;
  console.log(`Full phone number: ${fullPhoneNumber}`);

  next();
});


/**
 * @typedef USER
 */

const USER = mongoose.model("user", userSchema);

async function inIt() {
  var success = await USER.countDocuments({});
  if (success == 0) {
    await new USER({
      name: "Demo Account",
      email: "demo@yopmail.com",
      phone: "1234567890",
      password: "12345678",
      type: "user",
    }).save();
  }
}

inIt();

module.exports = USER;