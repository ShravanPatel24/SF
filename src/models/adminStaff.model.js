const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');

const adminStaffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    countryCode: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    fullPhoneNumber: { type: String },
    password: { type: String, required: true, },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminRoles', // Reference to the adminRoles model
        required: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' }, // The admin who created the staff
    status: {
        type: Number,
        default: 1, // 0 is Inactive, 1 is Active
    },
    isDelete: {
        type: Number,
        default: 1, // 0 is deleted, 1 is Active
    },
}, { timestamps: true });


// Hash password before saving
adminStaffSchema.pre('save', async function (next) {
    const staff = this;
    if (staff.isModified('password')) {
        staff.password = await bcrypt.hash(staff.password, 8);
    }
    next();
});

// Add a method to compare passwords
adminStaffSchema.methods.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
};

adminStaffSchema.pre("save", function (next) {
    this.fullPhoneNumber = `${this.countryCode}${this.phone}`;
    next();
});

adminStaffSchema.plugin(mongoosePaginate);
adminStaffSchema.plugin(aggregatePaginate);

const AdminStaff = mongoose.model('AdminStaff', adminStaffSchema);

module.exports = AdminStaff;