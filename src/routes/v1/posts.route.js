const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const postController = require('../../controllers/posts.controller');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { postsValidation } = require('../../validations');

router.post('/', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 }
]), validate(postsValidation.createPost), postController.createPost);

router.get('/', userAuth(), validate(postsValidation.getPosts), postController.getAllPosts);
router.get('/:id', userAuth(), validate(postsValidation.getPost), postController.getPostById);
router.get('/user/:userId', userAuth(), validate(postsValidation.getPostsByUserId), postController.getPostsByUserId);
router.patch('/:id', userAuth(), upload.array('images', 10), validate(postsValidation.updatePost), postController.updatePost);
router.delete('/:id', userAuth(), validate(postsValidation.deletePost), postController.deletePost);

// Like/Unlike routes
router.post('/:postId/like', userAuth(), postController.likePost);
router.delete('/:postId/unlike', userAuth(), postController.unlikePost);

// Comment routes
router.post('/:postId/comments', userAuth(), postController.addComment);
router.delete('/:commentId', userAuth(), postController.deleteComment);

module.exports = router;