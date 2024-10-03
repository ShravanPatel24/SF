const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const postController = require('../../controllers/posts.controller');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { postsValidation } = require('../../validations');

router.post('/', userAuth(), upload.array('images', 10), validate(postsValidation.createPost), postController.createPost);
router.get('/', userAuth(), validate(postsValidation.getPosts), postController.getAllPosts);
router.get('/:id', userAuth(), validate(postsValidation.getPost), postController.getPostById);
router.patch('/:id', userAuth(), upload.array('images', 10), validate(postsValidation.updatePost), postController.updatePost);
router.delete('/:id', userAuth(), validate(postsValidation.deletePost), postController.deletePost);

module.exports = router;