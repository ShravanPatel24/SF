const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    caption: { type: String, required: true },
    images: [{ type: String, required: true }],
    likes: { type: Number, default: 0 },
    comments: [{ text: String, postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, postedAt: { type: Date, default: Date.now } }],
    postedAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
