const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { PostsController } = require('../../controllers');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { postsValidation } = require('../../validations');
const { canAccessUser } = require('../../middlewares/privacyCheck');

// Get saved posts list - place specific routes first
router.get('/saved-posts', userAuth(), canAccessUser, PostsController.getSavedPosts);

// Save/Unsave routes for posts
router.post('/:postId/save', userAuth(), PostsController.savePost);  // Save a post
router.delete('/:postId/unsave', userAuth(), PostsController.unsavePost);  // Unsave a post

// Create a post
router.post('/', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 }
]), validate(postsValidation.createPost), PostsController.createPost);

// Get all posts
router.get('/', userAuth(), validate(postsValidation.getPosts), PostsController.getAllPosts);

// Get a post by ID - place less specific routes after
router.get('/:id', userAuth(), canAccessUser, validate(postsValidation.getPost), PostsController.getPostById);

// Get posts by user ID
router.get('/user/:userId', userAuth(), canAccessUser, validate(postsValidation.getPostsByUserId), PostsController.getPostsByUserId);

// Update a post
router.patch('/:id', userAuth(), upload.array('images', 10), validate(postsValidation.updatePost), PostsController.updatePost);

// Delete a post
router.delete('/:id', userAuth(), validate(postsValidation.deletePost), PostsController.deletePost);

// Like/Unlike routes
router.post('/:postId/like', userAuth(), PostsController.likePost);
router.delete('/:postId/unlike', userAuth(), PostsController.unlikePost);

// Comment routes
router.post('/:postId/comments', userAuth(), PostsController.addComment);
router.delete('/:commentId', userAuth(), PostsController.deleteComment);

module.exports = router;