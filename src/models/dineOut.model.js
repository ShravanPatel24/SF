const mongoose = require('mongoose');

const dineOutRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    dateTime: { type: Date, required: true },
    guests: { type: Number, required: true },
    dinnerType: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
    bookingId: { type: String, default: null },
    requestNumber: { type: String, required: true },
    tableNumber: { type: String, default: null },
}, {
    timestamps: true
});

const DineOutRequest = mongoose.model('DineOutRequest', dineOutRequestSchema);

module.exports = DineOutRequest;