const express = require('express');
const adminAuth = require('../../../middlewares/adminAuth');
const validate = require('../../../middlewares/validate');
const { adminRoleValidation } = require('../../../validations');
const { adminRoleController } = require('../../../controllers');

const router = express.Router();

router.route('/create').post(adminAuth('createRole'), validate(adminRoleValidation.createRole), adminRoleController.createRole);
router.route('/list').get(adminAuth('getRoles'), validate(adminRoleValidation.getRoles), adminRoleController.getRoles);
router.route('/list/dropdown').get(adminAuth('dropdown'), adminRoleController.getRolesWithoutPagination);
router
    .route('/:roleId')
    .get(adminAuth('getRole'), validate(adminRoleValidation.getRole), adminRoleController.getRole)
    .patch(adminAuth('updateRole'), validate(adminRoleValidation.updateRole), adminRoleController.updateRole)
    .delete(adminAuth('deleteRole'), validate(adminRoleValidation.deleteRole), adminRoleController.deleteRole);

module.exports = router;