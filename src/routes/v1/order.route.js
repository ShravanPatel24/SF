const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { orderValidation } = require('../../validations');
const { orderController } = require('../../controllers');

// --- Order Management Routes ---
// Rebook a room order
router.post('/rebook/:orderId', userAuth(), orderController.rebookRoomOrder);

// Reorder food or product items
router.post('/reorder/:orderId', userAuth(), orderController.reorderItems);

// Get transaction history for user or partner
router.get('/transactions', userAuth(), orderController.getTransactionHistoryForUserAndPartner);

// Create a new order
router.post('/create', userAuth(), validate(orderValidation.createOrderValidation), orderController.createOrder);

// Get all orders for the current user
router.get('/', userAuth(), orderController.getUserOrders);

// Route to fetch the list of completed bookings
router.get("/completed-bookings", userAuth(), orderController.getCompletedBookingsController);

// Get order details by order ID
router.get('/:orderId', userAuth(), validate(orderValidation.trackOrderValidation), orderController.getOrderById);

// Cancel an order
router.post('/cancel/:orderId', userAuth(), validate(orderValidation.cancelOrderValidation), orderController.cancelOrder);

// Track an order
router.get('/track/:orderId', userAuth(), validate(orderValidation.trackOrderValidation), orderController.trackOrder);

// --- Order History Routes ---
router.get('/history/all', userAuth(), orderController.getAllHistory);
router.get('/history/:category', userAuth(), orderController.getHistoryByCategory);

// --- Partner-Specific Routes ---
// Update order status
router.patch('/status/:orderId', userAuth(), validate(orderValidation.updateOrderStatusValidation), orderController.updateOrderStatus);

// Add/update delivery partner details
router.post('/:orderId/delivery-partner', userAuth('updateOrder'), orderController.updateDeliveryPartner);

// Get pending room requests for partner
router.get('/partner/food-requests', userAuth(), orderController.getPendingFoodRequests);

// Get pending room requests for partner
router.get('/partner/room-requests', userAuth(), orderController.getPendingRoomRequests);

// Get pending product requests for partner
router.get('/partner/product-requests', userAuth(), orderController.getPendingProductRequests);

// Get accepted or rejected orders by item type and status for partner
router.get('/partner/orders-by-status', userAuth(), orderController.getOrdersByTypeAndStatus);

// Accept or reject food request
router.patch('/partner/food-requests/:orderId', userAuth(), orderController.updatePartnerRequestStatus);

// Accept or reject room request
router.patch('/partner/room-requests/:orderId', userAuth(), orderController.updatePartnerRequestStatus);

// Accept or reject product request
router.patch('/partner/product-requests/:orderId', userAuth(), orderController.updatePartnerRequestStatus);

// --- Refund and Refund/Exchange Routes ---
// Get all refund requests for the partner
router.get('/partner/refunds', userAuth(), orderController.getPartnerRefunds);

// Get all approved refunds for the partner
router.get('/partner/refunds/approved', userAuth(), orderController.getApprovedRefunds);

// Request a refund for specific items
router.post('/user/:orderId/request-refund-or-exchange', userAuth(), orderController.requestRefundOrExchange);

// Process refund decision (accept/reject) by partner
router.patch('/partner/:orderId/refund-or-exchange/decision', userAuth(), orderController.processRefundOrExchangeDecision);

module.exports = router;