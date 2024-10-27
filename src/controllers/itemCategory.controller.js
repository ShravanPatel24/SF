const catchAsync = require('../utils/catchAsync');
const { ItemCategoryService } = require('../services');
const CONSTANTS = require("../config/constant");

// Create a new category
const createCategory = catchAsync(async (req, res) => {
    const { categoryName, categoryType, parentCategory } = req.body;

    // Ensure that parentCategory is only applied to food and product
    if (categoryType === 'room' && parentCategory) {
        return res.status(400).json({
            statusCode: 400,
            message: "Parent category is not allowed for room types."
        });
    }

    // Prepare category data for the service
    const categoryData = {
        categoryName,
        categoryType,
        parentCategory: categoryType === 'room' ? null : parentCategory // Only allow for product and food
    };

    try {
        // Use the service function to create a new category
        const newCategory = await ItemCategoryService.createCategory(categoryData);
        res.status(201).json({
            statusCode: 201,
            message: "Category created successfully.",
            data: newCategory
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: "Error creating category.",
            error: error.message
        });
    }
})

// Get all categories by type
const getCategoriesByType = catchAsync(async (req, res) => {
    const { categoryType } = req.params;
    try {
        const categories = await ItemCategoryService.getCategoriesByType(categoryType);
        res.status(200).json({ statusCode: 200, data: categories });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Get subcategories by parent category
const getSubcategoriesByParent = catchAsync(async (req, res) => {
    const { parentCategoryId } = req.params;
    try {
        const subcategories = await ItemCategoryService.getSubcategoriesByParent(parentCategoryId);
        res.status(200).json({ statusCode: 200, data: subcategories });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Update a category
const updateCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;
    const categoryData = req.body; // Assuming the category data comes in the request body

    try {
        const updatedCategory = await ItemCategoryService.updateCategory(categoryId, categoryData);
        res.status(200).json({
            statusCode: 200,
            message: "Category updated successfully.",
            data: updatedCategory
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Delete a category
const deleteCategory = catchAsync(async (req, res) => {
    const { categoryId } = req.params;

    try {
        await ItemCategoryService.deleteCategory(categoryId);
        res.status(200).json({
            statusCode: 200,
            message: "Category deleted successfully."
        });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

module.exports = {
    createCategory,
    getCategoriesByType,
    getSubcategoriesByParent,
    updateCategory,
    deleteCategory
};
