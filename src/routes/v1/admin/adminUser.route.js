const express = require('express');
const multer = require('multer');
const { adminAuth } = require('../../../middlewares');
const validate = require('../../../middlewares/validate');
const { userValidation, businessValidation } = require('../../../validations');
const { userController, adminAuthController, orderController, businessController } = require('../../../controllers'); // Import orderController for admin orders
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/orders', adminAuth('manageOrders'), orderController.getAllOrdersByAdmin);
router.get('/business/:businessId', adminAuth('manageBusiness'), businessController.getBusinessById);
router.patch('/update-business/:businessId', adminAuth('updateById'), validate(businessValidation.update), businessController.updateBusiness);

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
router
  .post('/reset-password', adminAuth('manageUsers'), adminAuthController.adminResetUserPassword);

// Uncomment if you want to use profile-specific routes in the future
// router
//     .route('/profile/:id')
//     .patch(adminAuth('updateProfile'), upload.any(), userController.updateById)
//     .get(adminAuth('updateProfile'), userController.getById);

module.exports = router;
