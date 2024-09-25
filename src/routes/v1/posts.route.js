const express = require('express');
const postController = require('../../controllers/posts.controller');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const postValidation = require('../../validations/posts.validation');

// Route for creating a new post
router.post('/', userAuth(), validate(postValidation.createPost), postController.createPost);

// Route for getting all posts
router.get('/', userAuth(), validate(postValidation.getPosts), postController.getAllPosts);

// Route for getting a post by ID
router.get('/:id', userAuth(), validate(postValidation.getPost), postController.getPostById);

// Route for updating a post by ID
router.patch('/:id', userAuth(), validate(postValidation.updatePost), postController.updatePost);

// Route for deleting a post by ID
router.delete('/:id', userAuth(), validate(postValidation.deletePost), postController.deletePost);

module.exports = router;
