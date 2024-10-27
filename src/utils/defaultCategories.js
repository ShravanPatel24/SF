const ItemCategoryModel = require("../models/itemCategory.model"); // Adjust the import based on your directory structure

const defaultCategories = [
    // Parent categories
    { categoryName: 'Main Course', categoryType: 'food', parentCategory: null },
    { categoryName: 'Fashion Apparel', categoryType: 'product', parentCategory: null },

    // Subcategories
    { categoryName: 'Panneer Butter Masala', categoryType: 'food', parentCategory: 'Main Course' }, // Subcategory of Italian Cuisine
    { categoryName: 'Luxury Suite', categoryType: 'room' }, // No parentCategory for room types
    { categoryName: 'Men Clothing', categoryType: 'product', parentCategory: 'Fashion Apparel' }, // Subcategory of Clothing
];

// Insert default categories if they don't exist
const insertDefaultCategories = async () => {
    try {
        // Insert parent categories first (filter out room categories that shouldn't have parentCategory)
        const parentCategories = await ItemCategoryModel.insertMany(defaultCategories.filter(cat => !cat.parentCategory));

        // Create a map to easily find parent category IDs
        const parentMap = {};
        parentCategories.forEach(cat => {
            parentMap[cat.categoryName] = cat._id; // Store the parent category ID
        });

        // Now insert subcategories, ensuring to set the parentCategory only for valid types
        const subCategories = defaultCategories
            .filter(cat => cat.parentCategory !== null)
            .map(cat => ({
                categoryName: cat.categoryName,
                categoryType: cat.categoryType,
                parentCategory: parentMap[cat.parentCategory] || null, // Assign the parent category ID
            }));

        // Insert subcategories
        await ItemCategoryModel.insertMany(subCategories);
        console.log("Default categories have been added successfully!");
    } catch (err) {
        console.error("Error inserting default categories:", err);
    }
};

module.exports = insertDefaultCategories;
