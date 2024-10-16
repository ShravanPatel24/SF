const express = require('express');
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { bankValidation } = require('../../validations');
const { bankController } = require('../../controllers');

const router = express.Router();


router.post('/bank-details', userAuth(), validate(bankValidation.createBankDetails), bankController.createOrUpdateBankDetails);
router.patch('/bank-details/:bankId', userAuth(), validate(bankValidation.updateBankDetails), bankController.updateBankDetails);
router.get('/bank-details', userAuth(), bankController.getBankDetails);
router.delete('/bank-details', userAuth(), bankController.deleteBankDetails);

module.exports = router;