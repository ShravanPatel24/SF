const express = require('express');
const postController = require('../../controllers/posts.controller');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { postsValidation } = require('../../validations');

// Route for creating a new post
router.post('/', userAuth(), validate(postsValidation.createPost), postController.createPost);

// Route for getting all posts
router.get('/', userAuth(), validate(postsValidation.getPosts), postController.getAllPosts);

// Route for getting a post by ID
router.get('/:id', userAuth(), validate(postsValidation.getPost), postController.getPostById);

// Route for updating a post by ID
router.patch('/:id', userAuth(), validate(postsValidation.updatePost), postController.updatePost);

// Route for deleting a post by ID
router.delete('/:id', userAuth(), validate(postsValidation.deletePost), postController.deletePost);

module.exports = router;
