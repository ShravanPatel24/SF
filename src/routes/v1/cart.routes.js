const express = require('express');
const { userAuth } = require('../../middlewares');
const { cartController } = require('../../controllers');

const router = express.Router();

router.post('/add', userAuth(), cartController.addToCart);
router.get('/', userAuth(), cartController.getCart);
router.delete('/remove', userAuth(), cartController.removeFromCart);
router.patch('/update', userAuth(), cartController.updateCartItem);
router.delete('/clear', userAuth(), cartController.clearCart);

// Guest User Routes
router.post('/guest/add', cartController.addGuestToCart); // Add item to guest cart
router.get('/guest/:guestId', cartController.getGuestCart); // Get guest cart
router.delete('/guest/remove', cartController.removeFromGuestCart); // Remove item from guest cart
router.delete('/guest/clear', cartController.clearGuestCart); // Clear guest cart

module.exports = router;