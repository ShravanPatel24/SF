const catchAsync = require('../utils/catchAsync');
const { CartService } = require('../services');
const { ItemModel } = require('../models');
const CONSTANTS = require("../config/constant");
const mongoose = require('mongoose');

// Add an item (food, product or checkout for rooms) to the cart
const addToCart = catchAsync(async (req, res) => {
    const { itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, deliveryAddress } = req.body;
    const userId = req.user._id;
    if (!mongoose.isValidObjectId(itemId)) { return res.status(400).json({ statusCode: 400, message: CONSTANTS.INVALID_ITEM_ID }) }
    const item = await ItemModel.findById(itemId);
    if (!item) { return res.status(404).json({ statusCode: 404, message: CONSTANTS.ITEM_NOT_FOUND }) }

    let pricePerUnit = 0;
    if (item.itemType === 'room') {
        if (!checkIn || !checkOut) { return res.status(400).json({ statusCode: 400, message: CONSTANTS.CHECKIN_CHECKOUT_REQUIRED }) }
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            return res.status(400).json({ statusCode: 400, message: CONSTANTS.INVALID_DATES });
        }
        pricePerUnit = item.roomPrice * nights;
    } else if (item.itemType === 'product' && item.variants && item.variants.length > 0) {
        const variant = item.variants.find(v => v.size === selectedSize && v.color === selectedColor);
        if (!variant) {
            return res.status(400).json({ statusCode: 400, message: CONSTANTS.VARIANT_NOT_FOUND });
        }
        pricePerUnit = variant.productPrice;
    } else if (item.itemType === 'food') {
        pricePerUnit = item.dishPrice || item.price || 0;
    }

    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
        return res.status(400).json({ statusCode: 400, message: CONSTANTS.INVALID_PRICE });
    }

    if (quantity <= 0) {
        return res.status(400).json({ statusCode: 400, message: CONSTANTS.QUANTITY_GREATER });
    }

    try {
        const cart = await CartService.addToCart(userId, itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, deliveryAddress);
        return res.status(200).json({ statusCode: 200, message: CONSTANTS.ADDED_TO_CART, cart });
    } catch (error) {
        return res.status(500).json({ statusCode: 500, message: 'An unexpected error occurred.', error: error.message });
    }
});

// Get the current user's cart
const getCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    try {
        const cart = await CartService.getCartByUser(userId);
        if (!cart) {
            return res.status(404).json({ statusCode: 404, message: CONSTANTS.CART_NOT_FOUND });
        }
        return res.status(200).json({ statusCode: 200, data: cart });
    } catch (error) {
        return res.status(403).json({ statusCode: 403, message: error.message });
    }
});

// Remove an item from the cart
const removeFromCart = catchAsync(async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user._id;

    if (!itemId) {
        return res.status(400).json({ statusCode: 400, message: "Item ID is missing." });
    }

    try {
        const updatedCart = await CartService.removeFromCart(userId, itemId);
        return res.status(200).json({ statusCode: 200, message: CONSTANTS.REMOVED_FROM_CART, updatedCart });
    } catch (error) {
        return res.status(500).json({ statusCode: 500, message: error.message });
    }
});

// Update cart item quantity
const updateCartItem = catchAsync(async (req, res) => {
    const { itemId, quantity } = req.body;
    const userId = req.user._id;

    try {
        const updatedCart = await CartService.updateCartItem(userId, itemId, quantity);
        return res.status(200).json({ statusCode: 200, message: CONSTANTS.CART_UPDATED, updatedCart });
    } catch (error) {
        return res.status(500).json({ statusCode: 500, message: error.message });
    }
});

// Clear the cart
const clearCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    try {
        const cart = await CartService.clearCart(userId);
        return res.status(200).json({
            statusCode: 200,
            message: CONSTANTS.CART_CLEARED,
            data: cart
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An error occurred while clearing the cart.'
        });
    }
});

module.exports = {
    addToCart,
    getCart,
    removeFromCart,
    updateCartItem,
    clearCart
};