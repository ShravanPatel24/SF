const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { orderValidation } = require('../../validations');
const { orderController } = require('../../controllers');

// Route to create an order
router.post('/create', userAuth(), validate(orderValidation.createOrderValidation), orderController.createOrder);

// Route to get all orders for the current user
router.get('/', userAuth(), orderController.getUserOrders);

// Route to get order details by order ID
router.get('/:orderId', userAuth(), validate(orderValidation.trackOrderValidation), orderController.getOrderById);

// Route to cancel an order
router.post('/cancel/:orderId', userAuth(), validate(orderValidation.cancelOrderValidation), orderController.cancelOrder);

// Route to track an order
router.get('/track/:orderId', userAuth(), validate(orderValidation.trackOrderValidation), orderController.trackOrder);

// Route to update order status
router.patch('/status/:orderId', userAuth(), validate(orderValidation.updateOrderStatusValidation), orderController.updateOrderStatus);

module.exports = router;