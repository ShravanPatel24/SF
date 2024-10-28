const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { itemsValidation } = require('../../validations');
const { itemsController, ItemCategoryController } = require('../../controllers');

// Routes for guest users
router.get('/guest/', itemsController.getAllItems); // Guest user - Get all items (products, food, rooms)
router.get('/guest/search', itemsController.searchItems); // Guest user - Search items
router.get('/guest/:itemId', itemsController.getItemById); // Guest user - Get item by ID

// Route to get categories by type (product, food, room)
router.get('/type/:categoryType', userAuth(), ItemCategoryController.getCategoriesByType);

// Route to get all rooms under a specific hotel (business)
router.get('/rooms/business/:businessId', userAuth(), validate(itemsValidation.getRoomsByBusinessId), itemsController.getRoomsByBusiness);
// Route to get all menu under a specific restaurant (business)
router.get('/foods/business/:businessId', userAuth(), validate(itemsValidation.getFoodByBusinessId), itemsController.getFoodByBusiness);
// Route to get all product under a specific Clothing (business)
router.get('/products/business/:businessId', userAuth(), validate(itemsValidation.getProductByBusinessId), itemsController.getProductByBusiness);

router.post('/create', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
]), validate(itemsValidation.createItem), itemsController.createItem);

router.get('/business/:businessId', userAuth(), validate(itemsValidation.getItemsByBusinessId), itemsController.getItemsByBusiness);
router.get('/business-type/:businessTypeId', userAuth(), validate(itemsValidation.getItemsByBusinessTypeId), itemsController.getItemsByBusinessType);
router.get('/:itemId', userAuth(), validate(itemsValidation.getItemById), itemsController.getItemById);

router.patch('/:itemId', userAuth(), upload.fields([
    { name: 'images', maxCount: 10 },
]), validate(itemsValidation.updateItem), itemsController.updateItem);

router.delete('/:itemId', userAuth(), validate(itemsValidation.deleteItem), itemsController.deleteItem);

module.exports = router;