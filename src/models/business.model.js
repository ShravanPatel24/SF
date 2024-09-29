const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const daywiseTimingSchema = new mongoose.Schema({
    day: { type: String, required: true },
    openingTime: { type: String, required: true },
    closingTime: { type: String, required: true }
}, { _id: false });

const businessSchema = new mongoose.Schema(
    {
        partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        email: { type: String, required: true },
        businessAddress: { type: String, required: true },
        openingDays: [{ type: String, required: true }],
        openingTime: { type: String, required: true },
        closingTime: { type: String, required: true },
        sameTimeForAllDays: { type: Boolean, required: true }, // true if same time for all days, false for different daywise timings
        uniformTiming: {
            openingTime: { type: String },
            closingTime: { type: String }
        },
        daywiseTimings: [daywiseTimingSchema], // Only required if sameTimeForAllDays is false
        status: { type: Number, default: 1 },
    },
    {
        timestamps: true
    }
);


businessSchema.plugin(mongoosePaginate);

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
