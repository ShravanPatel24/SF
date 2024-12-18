const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSON } = require('./plugins');
const mongoosePaginate = require('mongoose-paginate-v2');

const adminSchema = mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    passwordResetEmailOTP: Number,
    otpGeneratedAt: Date,
    emailOtpVerificationStatus: { type: Boolean, default: false },
    registeredAddress: {
        address: String,
        city: String,
        state: String,
        country: String,
        pinCode: String, //Pincode/ZipCode/Postal Code
        latitude: String,
        longitude: String,
        addressType: { type: String, default: "registered" }, //registered, billing, shipping
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminRoles',
        required: function () {
            return this.type !== 'superadmin'; // Only require 'role' if the type is not 'superadmin'
        }
    },
    profilePhoto: String,
    logo: String,
    type: { type: String, default: 'superadmin' },
    status: { type: Number, default: 1 }, //0 is Inactive, 1 is Active
    isDelete: { type: Number, default: 1 } //0 is delete, 1 is Active
}, {
    timestamps: true,
});

// add plugin that converts mongoose to json
adminSchema.plugin(toJSON);
adminSchema.plugin(mongoosePaginate);

/**
 * Check if name is taken
 * @param {string} name - The user's name
 * @param {ObjectId} [excludeAdminId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
adminSchema.statics.isNameTaken = async function (name, excludeAdminId) {
    const admin = await this.findOne({ name, isDelete: 1, _id: { $ne: excludeAdminId } });
    return !!admin;
};

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeAdminId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
adminSchema.statics.isEmailTaken = async function (email, excludeAdminId) {
    const admin = await this.findOne({ email, isDelete: 1, _id: { $ne: excludeAdminId } });
    return !!admin;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
adminSchema.methods.isPasswordMatch = async function (password) {
    const admin = this;
    if (!admin.password || !password) {
        return false; // return false if either password is undefined
    }
    return bcrypt.compare(password.toString(), admin.password);
};

adminSchema.pre('save', async function (next) {
    const admin = this;
    if (admin.isModified('password')) {
        admin.password = await bcrypt.hash(admin.password, 8);
    }
    next();
});

/**
 * @typedef ADMIN
 */
const ADMIN = mongoose.model('admin', adminSchema);
async function inIt() {
    var success = await ADMIN.countDocuments({});
    if (success == 0) {
        await new ADMIN({ name: 'Super Admin', email: 'akash@omnisttechhub.com', password: '12345678', type: 'superadmin' }).save();
    }
};

inIt();
module.exports = ADMIN;