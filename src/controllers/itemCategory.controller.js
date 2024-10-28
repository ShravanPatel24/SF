const catchAsync = require('../utils/catchAsync');
const { ItemCategoryService } = require('../services');
const CONSTANTS = require("../config/constant");

// Create a new category
const createCategory = catchAsync(async (req, res) => {
    const { categoryName, categoryType, parentCategory } = req.body;

    try {
        const categoryData = {
            categoryName,
            categoryType,
            parentCategory: categoryType === 'room' ? null : parentCategory // Only allow for product and food
        };

        // Use the service function to create a new category
        const newCategory = await ItemCategoryService.createCategory(categoryData);
        res.status(201).json({
            statusCode: 201,
            message: CONSTANTS.CATEGORY_CREATED,
            data: newCategory
        });
    } catch (error) {
        // Handle specific validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                statusCode: 400,
                message: "Invalid category data.",
                error: error.message
            });
        }
        res.status(500).json({
            statusCode: 500,
            message: "Error creating category.",
            error: error.message
        });
    }
});

// Get all categories by type
const getCategoriesByType = catchAsync(async (req, res) => {
    const { categoryType } = req.params;

    try {
        const categories = await ItemCategoryService.getCategoriesByType(categoryType);
        if (categories.length === 0) { return res.status(404).json({ statusCode: 404, message: `No categories found for type: ${categoryType}` }) }
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
    const categoryData = req.body;

    try {
        const updatedCategory = await ItemCategoryService.updateCategory(categoryId, categoryData);
        res.status(200).json({
            statusCode: 200,
            message: CONSTANTS.CATEGORY_UPDATED,
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
            message: CONSTANTS.CATEGORY_DELETED
        });
    } catch (error) {
        if (error.message === "Category not found") {
            return res.status(404).json({
                statusCode: 404,
                message: CONSTANTS.CATEGORY_NOT_FOUND
            });
        }
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