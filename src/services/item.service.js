const Item = require('../models/item.model');

// Create an item (Food, Room, or Product)
const createItem = async (itemData) => {
    const newItem = new Item(itemData);
    await newItem.save();
    return newItem;
};

// Get item by item ID
const getItemById = async (itemId) => {
    const item = await Item.findById(itemId);
    return item;
};

// Get items by business ID
const getItemsByBusiness = async (businessId) => {
    const items = await Item.find({ business: businessId });
    return items;
};

// Get items by businessType ID
const getItemsByBusinessType = async (businessTypeId) => {
    const items = await Item.find({ businessType: businessTypeId });
    return items;
};

// Update an item by ID
const updateItemById = async (itemId, updateData) => {
    const updatedItem = await Item.findByIdAndUpdate(itemId, updateData, { new: true });
    return updatedItem;
};

// Delete an item by ID
const deleteItemById = async (itemId) => {
    await Item.findByIdAndDelete(itemId);
};

module.exports = {
    createItem,
    getItemById,
    getItemsByBusiness,
    getItemsByBusinessType,
    updateItemById,
    deleteItemById,
};