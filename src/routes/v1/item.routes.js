const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const itemValidation = require('../../validations/item.validation');
const itemController = require('../../controllers/item.controller');

router.post('/create', userAuth(), validate(itemValidation.createItem), itemController.createItem);
router.get('/business/:businessId', userAuth(), validate(itemValidation.getItemsByBusinessId), itemController.getItemsByBusiness);
router.get('/business-type/:businessTypeId', userAuth(), validate(itemValidation.getItemsByBusinessTypeId), itemController.getItemsByBusinessType);
router.get('/:itemId', userAuth(), validate(itemValidation.getItemById), itemController.getItemById);
router.patch('/:itemId', userAuth(), validate(itemValidation.updateItem), itemController.updateItem);
router.delete('/:itemId', userAuth(), validate(itemValidation.deleteItem), itemController.deleteItem);
// Update operating details
router.put('/update-operating-details/:itemId', itemController.updateOperatingDetails);

module.exports = router;