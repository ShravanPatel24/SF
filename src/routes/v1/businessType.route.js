const express = require('express');
const { basicAuth, adminAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { businessTypeValidation } = require('../../validations');
const { businessTypeController } = require('../../controllers');

const router = express.Router();

router
    .route('/')
    .post(adminAuth('create'), validate(businessTypeValidation.create), businessTypeController.create)
    .get(adminAuth('gets'), validate(businessTypeValidation.getList), businessTypeController.getLists);

router
    .route('/:id')
    .get(adminAuth('get'), validate(businessTypeValidation.getById), businessTypeController.getById)
    .patch(adminAuth('updateById'), validate(businessTypeValidation.update), businessTypeController.updateById)
    .delete(adminAuth('deleteById'), validate(businessTypeValidation.deleteById), businessTypeController.deleteById);

router
    .route('/for/user')
    .get(basicAuth(), businessTypeController.getListWithoutPagination);

module.exports = router;

