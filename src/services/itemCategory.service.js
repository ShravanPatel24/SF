const { ItemCategoryModel } = require('../models');

// Create a new category
const createCategory = async (categoryName, categoryType, parentCategoryId = null) => {
    const category = new ItemCategoryModel({
        categoryName,
        categoryType,
        parentCategory: parentCategoryId || null
    });
    await category.save();
    return category;
};

// Get categories by type (product, food, room)
const getCategoriesByType = async (categoryType) => {
    const categories = await ItemCategoryModel.find({ categoryType, parentCategory: null });  // Only parent categories
    return categories;
};

// Get subcategories by parent category ID
const getSubcategoriesByParent = async (parentCategoryId) => {
    const subcategories = await ItemCategoryModel.find({ parentCategory: parentCategoryId });
    return subcategories;
};

// Update a category
const updateCategory = async (categoryId, categoryData) => {
    const updatedCategory = await ItemCategoryModel.findByIdAndUpdate(categoryId, categoryData, { new: true });
    if (!updatedCategory) {
        throw new Error("Category not found");
    }
    return updatedCategory;
};

// Delete a category
const deleteCategory = async (categoryId) => {
    const deletedCategory = await ItemCategoryModel.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
        throw new Error("Category not found");
    }
    return deletedCategory;
};

module.exports = {
    createCategory,
    getCategoriesByType,
    getSubcategoriesByParent,
    updateCategory,
    deleteCategory
};
