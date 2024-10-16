const express = require('express');
const { userAuth } = require('../../middlewares');
const { cartController } = require('../../controllers');

const router = express.Router();

router.post('/add', userAuth(), cartController.addToCart);
router.get('/', userAuth(), cartController.getCart);
router.delete('/remove', userAuth(), cartController.removeFromCart);
router.patch('/update', userAuth(), cartController.updateCartItem);
router.delete('/clear', userAuth(), cartController.clearCart);

module.exports = router;