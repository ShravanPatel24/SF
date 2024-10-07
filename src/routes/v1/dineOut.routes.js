const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { dineOutValidation } = require('../../validations');
const { dineOutController } = require('../../controllers');

// Create a new dine-out request
router.post('/request/create', userAuth(), validate(dineOutValidation.createDineOutRequest), dineOutController.createDineOutRequest);
router.get('/business/:businessId', userAuth(), validate(dineOutValidation.getDineOutRequestsForBusiness), dineOutController.getDineOutRequestsForBusiness);
router.get('/request/:requestId', userAuth(), dineOutController.getDineOutRequestById);
router.patch('/confirm/:requestId', userAuth(), validate(dineOutValidation.updateDineOutRequestStatus), dineOutController.updateDineOutRequestStatus);

module.exports = router;
