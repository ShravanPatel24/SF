const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { itemsValidation } = require('../../validations');
const { itemsController } = require('../../controllers');

router.post('/create', userAuth(), validate(itemsValidation.createItem), itemsController.createItem);
router.get('/business/:businessId', userAuth(), validate(itemsValidation.getItemsByBusinessId), itemsController.getItemsByBusiness);
router.get('/business-type/:businessTypeId', userAuth(), validate(itemsValidation.getItemsByBusinessTypeId), itemsController.getItemsByBusinessType);
router.get('/:itemId', userAuth(), validate(itemsValidation.getItemById), itemsController.getItemById);
router.patch('/:itemId', userAuth(), validate(itemsValidation.updateItem), itemsController.updateItem);
router.delete('/:itemId', userAuth(), validate(itemsValidation.deleteItem), itemsController.deleteItem);
// Update operating details
router.put('/update-operating-details/:itemId', itemsController.updateOperatingDetails);

module.exports = router;