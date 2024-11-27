const catchAsync = require('../utils/catchAsync');
const { ItemCategoryService } = require('../services');
const CONSTANTS = require("../config/constant");

// Create a new category
const createCategory = catchAsync(async (req, res) => {
    const { categoryName, categoryType, parentCategory, tax, inheritParentTax, businessType } = req.body;

    try {
        const categoryData = {
            categoryName,
            categoryType,
            parentCategory: categoryType === 'room' ? null : parentCategory, // Only allow parent for product and food
            tax,
            inheritParentTax: inheritParentTax || false, // Default to false if not provided
            businessType,
        };

        // Create the category
        const newCategory = await ItemCategoryService.createCategory(categoryData);
        res.status(201).json({
            statusCode: 201,
            message: CONSTANTS.CATEGORY_CREATED,
            data: newCategory,
        });
    } catch (error) {
        if (error.message.includes('Category')) {
            return res.status(400).json({
                statusCode: 400,
                message: error.message,
            });
        }
        res.status(500).json({
            statusCode: 500,
            message: 'Error creating category.',
            error: error.message,
        });
    }
});

// Endpoint to get the tax rate for a specific category
const getCategoryTax = catchAsync(async (req, res) => {
    const { categoryId } = req.params;

    try {
        const taxRate = await ItemCategoryService.getCategoryTax(categoryId);
        res.status(200).json({ statusCode: 200, tax: taxRate });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
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

const getCategoriesByBusinessType = catchAsync(async (req, res) => {
    const { businessTypeId } = req.params;

    try {
        const categories = await ItemCategoryService.getCategoriesByBusinessType(businessTypeId);
        res.status(200).json({ statusCode: 200, data: categories });
    } catch (error) {
        res.status(400).json({ statusCode: 400, message: error.message });
    }
});

// Get all categories with filters, pagination, and sorting
const getAllCategories = catchAsync(async (req, res) => {
    const { page, limit, sortBy, search, status, categoryType } = req.query;
    const categories = await ItemCategoryService.getAllCategories({
        page,
        limit,
        sortBy,
        search,
        status,
        categoryType,
    });

    res.status(200).json({
        statusCode: 200,
        data: {
            docs: categories.docs,
            totalDocs: categories.totalDocs,
            limit: categories.limit,
            totalPages: categories.totalPages,
            page: categories.page,
            pagingCounter: categories.pagingCounter,
            hasPrevPage: categories.hasPrevPage,
            hasNextPage: categories.hasNextPage,
            prevPage: categories.prevPage,
            nextPage: categories.nextPage,
        },
        message: CONSTANTS.LIST
    });
});

// Get category by category ID
const getCategoryById = catchAsync(async (req, res) => {
    const { categoryId } = req.params;

    try {
        const category = await ItemCategoryService.getCategoryById(categoryId);
        if (!category) {
            return res.status(404).json({
                statusCode: 404,
                message: CONSTANTS.CATEGORY_NOT_FOUND
            });
        }
        res.status(200).json({
            statusCode: 200,
            data: category
        });
    } catch (error) {
        res.status(400).json({
            statusCode: 400,
            message: error.message
        });
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

const getActiveCategories = catchAsync(async (req, res) => {
    try {
        const activeCategories = await ItemCategoryService.getActiveCategories();
        res.status(200).json({
            statusCode: 200,
            message: "Active categories retrieved successfully.",
            data: activeCategories,
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: "Failed to retrieve active categories.",
            error: error.message,
        });
    }
});

module.exports = {
    createCategory,
    getCategoryTax,
    getCategoriesByType,
    getCategoriesByBusinessType,
    getAllCategories,
    getCategoryById,
    getSubcategoriesByParent,
    updateCategory,
    deleteCategory,
    getActiveCategories
};