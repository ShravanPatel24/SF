const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { itemsValidation } = require('../../validations');
const { itemsController } = require('../../controllers');

router.post('/create', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
]), validate(itemsValidation.createItem), itemsController.createItem);

router.get('/business/:businessId', userAuth(), validate(itemsValidation.getItemsByBusinessId), itemsController.getItemsByBusiness);

router.get('/business-type/:businessTypeId', userAuth(), validate(itemsValidation.getItemsByBusinessTypeId), itemsController.getItemsByBusinessType);

// This is the dynamic route
router.get('/:itemId', userAuth(), validate(itemsValidation.getItemById), itemsController.getItemById);

router.patch('/:itemId', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
]), validate(itemsValidation.updateItem), itemsController.updateItem);

router.patch('/:itemId', userAuth(), validate(itemsValidation.updateItem), itemsController.updateItem);

router.delete('/:itemId', userAuth(), validate(itemsValidation.deleteItem), itemsController.deleteItem);

module.exports = router;