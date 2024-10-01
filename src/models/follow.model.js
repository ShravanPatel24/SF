const mongoose = require("mongoose");

const followSchema = new mongoose.Schema({
    follower: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    createdAt: { type: Date, default: Date.now }
});

followSchema.index({ follower: 1, following: 1 }, { unique: true });

const FOLLOW = mongoose.model("follow", followSchema);

module.exports = FOLLOW;