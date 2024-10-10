const mongoose = require('mongoose');
const { Schema } = mongoose;

const followRequestSchema = new Schema({
    follower: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

const FollowRequestModel = mongoose.model('FollowRequest', followRequestSchema);

module.exports = FollowRequestModel;