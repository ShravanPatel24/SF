const mongoose = require('mongoose');

const postlikeSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
}, {
    timestamps: true
});

const Like = mongoose.model('post_like', postlikeSchema);

module.exports = Like;