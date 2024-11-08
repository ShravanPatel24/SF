const mongoose = require('mongoose');

const adminSettingSchema = new mongoose.Schema({
    settingsId: { type: Number, default: 1, unique: true },
    commission: { type: Number, required: true },
    platformFee: { type: Number, required: false },
    websiteName: { type: String, required: true },
    adminNo: { type: String, required: true },
    socialMediaLinks: {
        facebook: { type: String },
        twitter: { type: String },
        instagram: { type: String },
        linkedin: { type: String }
    },
    address: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    adminSupportEmail: { type: String, required: true },
    status: {
        type: Number,
        default: 1, // 0 is Inactive, 1 is Active
    },
    isDelete: {
        type: Number,
        default: 1,
    },
}, {
    timestamps: true
});

const AdminSetting = mongoose.model('AdminSetting', adminSettingSchema);

module.exports = AdminSetting;