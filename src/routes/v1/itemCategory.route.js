const express = require('express');
const { ItemCategoryController } = require('../../controllers');

const router = express.Router();

// Route to create a category
router.post('/create', ItemCategoryController.createCategory);

// Route to get categories by type (product, food, room)
router.get('/type/:categoryType', ItemCategoryController.getCategoriesByType);

// Route to get subcategories by parent category
router.get('/subcategories/:parentCategoryId', ItemCategoryController.getSubcategoriesByParent);

// Route to update a category
router.patch('/update/:categoryId', ItemCategoryController.updateCategory);

// Route to delete a category
router.delete('/delete/:categoryId', ItemCategoryController.deleteCategory);

module.exports = router;