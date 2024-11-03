const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { orderValidation } = require('../../validations');
const { orderController } = require('../../controllers');

// --- Order Management Routes ---

// Create a new order
router.post('/create', userAuth(), validate(orderValidation.createOrderValidation), orderController.createOrder);

// Get all orders for the current user
router.get('/', userAuth(), orderController.getUserOrders);

// Get order details by order ID
router.get('/:orderId', userAuth(), validate(orderValidation.trackOrderValidation), orderController.getOrderById);

// Cancel an order
router.post('/cancel/:orderId', userAuth(), validate(orderValidation.cancelOrderValidation), orderController.cancelOrder);

// Track an order
router.get('/track/:orderId', userAuth(), validate(orderValidation.trackOrderValidation), orderController.trackOrder);

// --- Partner-Specific Routes ---

// Update order status
router.patch('/status/:orderId', userAuth(), validate(orderValidation.updateOrderStatusValidation), orderController.updateOrderStatus);

// Add/update delivery partner details
router.post('/:orderId/delivery-partner', userAuth('updateOrder'), orderController.updateDeliveryPartner);

// Get pending food requests for partner
router.get('/partner/food-requests', userAuth(), orderController.getPartnerFoodRequests);

// Accept/reject food order by partner
router.patch('/partner/food-requests/:orderId', userAuth(), validate(orderValidation.updatePartnerOrderStatusValidation), orderController.updatePartnerOrderStatus);

// --- Refund and Return/Exchange Routes ---

// Request a refund for specific items
router.post('/user/request-refund/:orderId', userAuth(), orderController.requestRefund);

// Process refund decision (accept/reject) by partner
router.patch('/partner/refund-request/:orderId/respond', userAuth(), orderController.respondToRefundRequest);

// Initiate return or exchange request by user
router.post('/user/:orderId/return-or-exchange', userAuth(), orderController.initiateReturnOrExchange);

// Process return/exchange decision (accept/reject) by partner
router.patch('/partner/:orderId/return-or-exchange/decision', userAuth(), orderController.processReturnDecision);

module.exports = router;
