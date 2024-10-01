const express = require('express');
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { businessValidation } = require('../../validations');
const { businessController } = require('../../controllers');

const router = express.Router();

// Partner's Business
router.get('/near', userAuth(), validate(businessValidation.getBusinessesNearUser), businessController.getBusinessesNearUser);
router
    .route('/')
    .post(userAuth('create'), validate(businessValidation.create), businessController.createBusinessForPartner)

router.get('/:partnerId', userAuth(), validate(businessValidation.getBusinessByPartnerId), businessController.getBusinessesForPartner);
router
    .route('/:businessId')
    .patch(userAuth('updateById'), validate(businessValidation.update), businessController.updateBusiness)
    .delete(userAuth('deleteById'), validate(businessValidation.deleteById), businessController.deleteBusiness);


module.exports = router;