const express = require('express');
const { ItemCategoryController } = require('../../controllers');
const { adminAuth } = require('../../middlewares');

const router = express.Router();

// Route to get the tax rate for a specific category
router.get('/:categoryId/tax', adminAuth(), ItemCategoryController.getCategoryTax);

// Route to get categories with status filters
router.get('/categories', adminAuth(), ItemCategoryController.getAllCategories);

// Route to create a category
router.post('/create', adminAuth('create'), ItemCategoryController.createCategory);

// Route to get categories by type (product, food, room)
router.get('/type/:categoryType', adminAuth(), ItemCategoryController.getCategoriesByType);

// Route to get subcategories by parent category
router.get('/subcategories/:parentCategoryId', adminAuth(), ItemCategoryController.getSubcategoriesByParent);

// Route to update a category
router.patch('/update/:categoryId', adminAuth(), ItemCategoryController.updateCategory);

// Route to delete a category
router.delete('/delete/:categoryId', adminAuth(), ItemCategoryController.deleteCategory);

// Route to get category details by ID
router.get('/category/:categoryId', adminAuth(), ItemCategoryController.getCategoryById);

module.exports = router;