const express = require('express');
const { adminStaffController, adminAuthController } = require('../../../controllers');
const { adminAuth } = require('../../../middlewares');
const validate = require('../../../middlewares/validate');
const { adminStaffValidation } = require('../../../validations');
const checkPermission = require('../../../middlewares/checkPermission');

const router = express.Router();

router.get(
    '/users',
    adminAuth(), // Ensure the user is authenticated
    checkPermission('User Management', 'view'), // Check if the user can view users
    adminStaffController.getAdminStaffUsers // Controller logic
);

// Place the paginated list route first
router.get('/list', adminAuth(), adminStaffController.getAdminStaffUsers);  // Paginated staff list

// Route to get staff with role and permissions
router.get('/:staffId/role', adminAuth(), adminStaffController.getStaffWithRole);  // Staff with role

// Place the dynamic ID route after the specific routes
router.get('/:staffId', adminAuth(), adminStaffController.getAdminStaffUser);  // Single staff user by ID

// Other routes
router.post('/create', adminAuth(), validate(adminStaffValidation.createStaff), adminStaffController.createAdminStaffUser);
router.patch('/:staffId', adminAuth(), validate(adminStaffValidation.updateStaff), adminStaffController.updateAdminStaffUser);
router.delete('/:staffId', adminAuth(), adminStaffController.deleteAdminStaffUser);
router.get('/list/all', adminAuth(), adminStaffController.getAdminStaffUsersWithoutPagination);
router.put('/profile/update', adminAuth(), adminStaffController.updateProfile);
router.post('/password/change', adminAuth(), adminStaffController.changeStaffPassword);

router.post('/reset-password-staff', adminAuth('manageUsers'), adminStaffController.adminResetStaffPassword);

module.exports = router;
