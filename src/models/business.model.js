const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const businessSchema = new mongoose.Schema(
    {
        partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        businessName: { type: String, required: true },
        businessType: { type: mongoose.Schema.Types.ObjectId, ref: 'businessType' },
        businessDescription: { type: String, required: true },
        mobile: { type: String, required: true },
        email: { type: String, required: true },
        businessAddress: { type: String, required: true },
        openingDays: [{ type: String, required: true }],
        openingTime: { type: String, required: true },
        closingTime: { type: String, required: true },
        status: { type: Number, default: 1 },
    },
    {
        timestamps: true
    }
);

businessSchema.plugin(mongoosePaginate);

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
