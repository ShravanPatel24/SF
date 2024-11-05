const express = require('express');
const multer = require('multer');
const { adminAuth, userAuth } = require('../../../middlewares');
const validate = require('../../../middlewares/validate');
const { userValidation, businessValidation } = require('../../../validations');
const { userController, adminAuthController, orderController, businessController, dineOutController } = require('../../../controllers');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Place transaction-history routes at the top for priority
router.get('/orders/transaction-history/:orderId', adminAuth('manageOrders'), orderController.getTransactionHistoryByOrderId);
router.get('/orders/transaction-history', adminAuth('manageOrders'), orderController.getAllTransactionHistory);

router.get('/orders/id/:orderId', adminAuth('manageOrders'), orderController.getOrderById);
router.get('/orders/:userId', adminAuth('manageOrders'), orderController.getOrdersByUserIdAdmin);
router.get('/orders/partner/:partnerId', adminAuth('manageOrders'), orderController.getOrdersByPartnerId);
router.get('/orders', adminAuth('manageOrders'), orderController.getAllOrdersAdmin);

router.get('/business/:businessId', adminAuth('manageBusiness'), businessController.getBusinessById);
router.patch('/update-business/:businessId', adminAuth('updateById'), validate(businessValidation.update), businessController.updateBusiness);

router.get('/dineout-requests', adminAuth('manageDineOutRequests'), dineOutController.getAllDineOutRequests);
router.get('/dineout-requests/:requestId', adminAuth('manageDineOutRequests'), dineOutController.getDineOutRequestByIdAdmin);

router
  .route('/')
  .post(adminAuth('getLists'), upload.any(), userController.createUserByAdmin)
  .get(adminAuth('getLists'), validate(userValidation.getUsers), userController.getLists);

router
  .route('/:id')
  .get(adminAuth('getUser'), validate(userValidation.getUser), userController.getById)
  .patch(adminAuth('updateUser'), upload.any(), userController.updateById)
  .delete(adminAuth('deleteUser'), validate(userValidation.deleteUser), userController.deleteUser);

// Route for admin to reset a user's or partner's password
router.post('/reset-password', adminAuth('manageUsers'), adminAuthController.adminResetUserPassword);

module.exports = router;