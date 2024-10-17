const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Post Schema
const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    caption: { type: String, required: true },
    type: {
        type: String,
        enum: ['photo', 'reel', 'story', 'mixed'], // Possible post types
        required: true
    },
    images: [{
        type: String,
        required: function () { return this.type === 'photo' || this.type === 'story' || this.type === 'mixed'; }  // Required for photo/story/mixed
    }],
    videoUrl: {
        type: String,
        required: function () { return this.type === 'reel' || this.type === 'mixed'; }  // Required for reels or mixed
    },
    createdAt: { type: Date, default: Date.now },  // Auto-timestamp
    updatedAt: { type: Date, default: Date.now }  // Auto-timestamp
}, {
    timestamps: true  // Enable timestamps (createdAt, updatedAt)
});

// Add virtual field for counting likes
postSchema.virtual('likeCount', {
    ref: 'post_like',  // Reference the post_like schema
    localField: '_id', // Field in Post schema
    foreignField: 'postId', // Field in post_like schema
    count: true // Return the count of likes
});

// Add virtual field for counting comments
postSchema.virtual('commentCount', {
    ref: 'Comment',  // Reference the Comment schema
    localField: '_id', // Field in Post schema
    foreignField: 'postId', // Field in Comment schema
    count: true // Return the count of comments
});

// To ensure virtual fields are serialized in the output
postSchema.set('toObject', { virtuals: true });
postSchema.set('toJSON', { virtuals: true });

// Pagination plugin for paginating results
postSchema.plugin(mongoosePaginate);

const Post = mongoose.model('Post', postSchema);

module.exports = Post;