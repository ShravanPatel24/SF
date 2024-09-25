const express = require('express');
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { businessDetailController } = require('../../controllers');

const router = express.Router();

// Partner's Business
router
    .route('/')
    .post(userAuth('create'), businessDetailController.createBusinessForPartner)

router
    .route('/:id')
    .get(userAuth('gets'), businessDetailController.getBusinessesForPartner)
    .patch(userAuth('updateById'), businessDetailController.updateBusiness)
    .delete(userAuth('deleteById'), businessDetailController.deleteBusiness);

module.exports = router;