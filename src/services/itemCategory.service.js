const mongoose = require('mongoose');
const { ItemCategoryModel, BusinessTypeModel } = require('../models');
const CONSTANTS = require("../config/constant");
const pluralize = require('pluralize');

// Create a new category
const createCategory = async ({ categoryName, categoryType, parentCategory, tax, inheritParentTax, businessType }) => {
    try {
        // Validate the provided businessType ID
        if (!parentCategory && (!businessType || !mongoose.Types.ObjectId.isValid(businessType))) {
            throw new Error("Valid business type ID is required for parent categories.");
        }

        let inheritedBusinessType = null;

        // If this is a subcategory, validate the parentCategory and inherit the businessType
        if (parentCategory) {
            const parent = await ItemCategoryModel.findById(parentCategory);
            if (!parent) {
                throw new Error("Parent category not found.");
            }
            inheritedBusinessType = parent.businessType;

            // Ensure subcategories don't have their own businessType directly
            if (businessType && businessType !== inheritedBusinessType.toString()) {
                throw new Error("Subcategories must inherit the business type from their parent.");
            }
        }

        // Validate the businessType for parent categories
        if (!parentCategory) {
            const existingBusinessType = await BusinessTypeModel.findById(businessType);
            if (!existingBusinessType) {
                throw new Error("Business type not found.");
            }
        }

        // Normalize the category name
        const normalizedCategoryName = categoryName.trim().toLowerCase();
        const singularName = pluralize.singular(normalizedCategoryName);
        const pluralName = pluralize.plural(normalizedCategoryName);

        // Check for duplicates within the same business type and parent category
        const existingCategory = await ItemCategoryModel.findOne({
            $or: [
                { categoryName: { $regex: `^${singularName}$`, $options: 'i' } },
                { categoryName: { $regex: `^${pluralName}$`, $options: 'i' } },
            ],
            businessType: inheritedBusinessType || businessType,
            parentCategory: parentCategory || null,
        });

        if (existingCategory) {
            throw new Error(
                `Category "${categoryName}" already exists in the selected scope.`
            );
        }

        // Create the new category
        const category = new ItemCategoryModel({
            categoryName,
            categoryType,
            parentCategory: parentCategory || null,
            tax: parentCategory ? null : tax,
            inheritParentTax: inheritParentTax !== undefined ? inheritParentTax : !!parentCategory,
            businessType: inheritedBusinessType || businessType,
        });

        await category.save();
        return category;

    } catch (error) {
        // Handle MongoDB duplicate key errors
        if (error.code === 11000 && error.keyPattern?.categoryName) {
            throw new Error(
                `A category with the name "${categoryName}" already exists.`
            );
        }
        // Rethrow any other errors
        throw error;
    }
};

// Get the applicable tax rate for a category
const getCategoryTax = async (categoryId) => {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID");
    }

    const category = await ItemCategoryModel.findById(categoryId);

    if (!category) {
        throw new Error("Category not found");
    }

    // If inheritParentTax is true, look up the parent's tax rate
    if (category.inheritParentTax && category.parentCategory) {
        const parentCategory = await ItemCategoryModel.findById(category.parentCategory);
        return parentCategory ? parentCategory.tax : category.tax;
    }

    // Otherwise, return the category's own tax rate
    return category.tax;
};

// Get categories by type (product, food, room)
const getCategoriesByType = async (categoryType) => {
    const categories = await ItemCategoryModel.find({ categoryType, parentCategory: null });
    const categoriesWithSubcategories = await Promise.all(categories.map(async (category) => {
        const subcategories = await ItemCategoryModel.find({ parentCategory: category._id });
        return {
            ...category.toObject(),
            subcategories
        };
    }));

    return categoriesWithSubcategories;
};

const getCategoriesByBusinessType = async (businessTypeId) => {
    if (!mongoose.Types.ObjectId.isValid(businessTypeId)) {
        throw new Error("Invalid business type ID.");
    }

    return await ItemCategoryModel.find({
        businessType: businessTypeId,
        parentCategory: null, // Only fetch parent categories
        isDelete: 1,
    });
};

// Get all categories with optional filters, pagination, and sorting
const getAllCategories = async ({ page = 1, limit = 10, sortBy = 'asc', search, status, categoryType }) => {
    const query = { isDelete: 1 };
    if (status === '1') {
        query.status = 1;
    } else if (status === '0') {
        query.status = 0;
    }

    if (search) {
        query.categoryName = { $regex: search, $options: 'i' };
    }
    if (categoryType) {
        query.categoryType = categoryType;
    }
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { categoryName: sortBy === 'asc' ? 1 : -1 },
    };

    const categories = await ItemCategoryModel.paginate(query, options);
    return categories;
};

// Get category by category ID
const getCategoryById = async (categoryId) => {
    // Validate categoryId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error(CONSTANTS.INVALID_CATEGORY_ID);
    }

    const category = await ItemCategoryModel.findById(categoryId).populate('parentCategory', 'categoryName');
    if (!category) {
        throw new Error(CONSTANTS.CATEGORY_NOT_FOUND);
    }
    return category;
};

// Get subcategories by parent category ID
const getSubcategoriesByParent = async (parentCategoryId) => {
    if (!mongoose.Types.ObjectId.isValid(parentCategoryId)) { throw new Error("Invalid parent category ID") }

    const subcategories = await ItemCategoryModel.find({ parentCategory: parentCategoryId })
        .populate('parentCategory', 'categoryName');

    if (subcategories.length === 0) { throw new Error(CONSTANTS.INVALID_PARENT_ID) }
    return subcategories;
};

// Update a category
const updateCategory = async (categoryId, categoryData) => {
    // Validate categoryId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error(CONSTANTS.INVALID_CATEGORY_ID);
    }

    // Validate categoryType
    if (categoryData.categoryType && !['food', 'room', 'product'].includes(categoryData.categoryType)) {
        throw new Error(CONSTANTS.INVALID_CATEGORY_TYPE);
    }

    // Handle soft delete
    if (categoryData.isDelete === 0) {
        const deletedCategory = await ItemCategoryModel.findByIdAndUpdate(
            categoryId,
            { isDelete: 0 }, // Set isDelete to 0 for soft delete
            { new: true }
        );
        if (!deletedCategory) {
            throw new Error(CONSTANTS.CATEGORY_NOT_FOUND);
        }
        return { category: deletedCategory, message: CONSTANTS.CATEGORY_DELETED };
    }

    // Update category
    const updatedCategory = await ItemCategoryModel.findByIdAndUpdate(categoryId, categoryData, { new: true });
    if (!updatedCategory) {
        throw new Error(CONSTANTS.CATEGORY_NOT_FOUND);
    }

    // Determine the message based on the update type
    let message = CONSTANTS.CATEGORY_UPDATED; // Default message
    if (categoryData.status !== undefined) {
        message = categoryData.status === 1
            ? CONSTANTS.CATEGORY_ACTIVATED
            : CONSTANTS.CATEGORY_INACTIVATED;
    }

    return { category: updatedCategory, message };
};

// Delete a category
const deleteCategory = async (categoryId) => {
    const deletedCategory = await ItemCategoryModel.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
        throw new Error(CONSTANTS.CATEGORY_NOT_FOUND);
    }
    return deletedCategory;
};

const getActiveCategories = async () => {
    const query = {
        status: 1, // Only active categories
        isDelete: 1, // Not deleted
    };

    const activeCategories = await ItemCategoryModel.find(query)
        .sort({ categoryName: 1 }) // Sort by category name
        .populate('parentCategory', 'categoryName'); // Optional: Populate parentCategory

    return activeCategories;
};

module.exports = {
    createCategory,
    getCategoryTax,
    getCategoriesByType,
    getCategoriesByBusinessType,
    getCategoryById,
    getSubcategoriesByParent,
    getAllCategories,
    updateCategory,
    deleteCategory,
    getActiveCategories
};