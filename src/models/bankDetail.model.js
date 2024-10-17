const mongoose = require('mongoose');

const BankDetailSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    country: {
        type: String,
        required: true
    },
    bankName: {
        type: String,
        required: true
    },
    accountName: {
        type: String,
        required: true
    },
    accountNumber: {
        type: String,
        required: true
    },
    ifscCode: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('BankDetail', BankDetailSchema);