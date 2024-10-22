const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { itemsValidation } = require('../../validations');
const { itemsController } = require('../../controllers');

// Routes for guest users
router.get('guest/', itemsController.getAllItems); // Guest user - Get all items (products, food, rooms)
router.get('guest/search', itemsController.searchItems); // Guest user - Search items
router.get('/guest/:itemId', itemsController.getItemById); // Guest user - Get item by ID

router.post('/create', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
]), validate(itemsValidation.createItem), itemsController.createItem);

router.get('/business/:businessId', userAuth(), validate(itemsValidation.getItemsByBusinessId), itemsController.getItemsByBusiness);
router.get('/business-type/:businessTypeId', userAuth(), validate(itemsValidation.getItemsByBusinessTypeId), itemsController.getItemsByBusinessType);
router.get('/:itemId', userAuth(), validate(itemsValidation.getItemById), itemsController.getItemById);

router.patch('/:itemId', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
]), validate(itemsValidation.updateItem), itemsController.updateItem);

router.patch('/:itemId', userAuth(), validate(itemsValidation.updateItem), itemsController.updateItem);

router.delete('/:itemId', userAuth(), validate(itemsValidation.deleteItem), itemsController.deleteItem);

module.exports = router;