const catchAsync = require('../utils/catchAsync');
const { CartService } = require('../services');
const { ItemModel } = require('../models');
const CONSTANTS = require("../config/constant");
const mongoose = require('mongoose');

// Add an item (food, product or checkout for rooms) to the cart
const addToCart = catchAsync(async (req, res) => {
    const { itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, deliveryAddress } = req.body;
    const userId = req.user._id;
    if (!mongoose.isValidObjectId(itemId)) { return res.status(400).json({ message: CONSTANTS.INVALID_ITEM_ID }) }
    const item = await ItemModel.findById(itemId);
    if (!item) { return res.status(404).json({ message: CONSTANTS.ITEM_NOT_FOUND }) }
    let pricePerUnit = 0;

    if (item.itemType === 'room') {
        if (!checkIn || !checkOut) { return res.status(400).json({ message: CONSTANTS.CHECKIN_CHECKOUT_REQUIRED }) }
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights <= 0) { return res.status(400).json({ message: CONSTANTS.INVALID_DATES }) }
        pricePerUnit = item.roomPrice * nights;
    }
    else if (item.itemType === 'product' && item.variants && item.variants.length > 0) {
        const variant = item.variants.find(v => v.size === selectedSize && v.color === selectedColor);
        if (!variant) {
            return res.status(400).json({ message: CONSTANTS.VARIANT_NOT_FOUND });
        }
        pricePerUnit = variant.productPrice;
    }
    else if (item.itemType === 'food') { pricePerUnit = item.dishPrice || item.price || 0 }

    if (isNaN(pricePerUnit) || pricePerUnit <= 0) { return res.status(400).json({ message: CONSTANTS.INVALID_PRICE }) }

    if (quantity <= 0) { return res.status(400).json({ message: CONSTANTS.QUANTITY_GREATER }) }
    // Add the item to the cart using the CartService
    try {
        const cart = await CartService.addToCart(userId, itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, deliveryAddress);
        res.status(200).json({ message: CONSTANTS.ADDED_TO_CART, cart });
    } catch (error) {
        // Handle any unexpected errors
        return res.status(500).json({ message: 'An unexpected error occurred.', error: error.message });
    }
});

// Get the current user's cart
const getCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    try {
        const cart = await CartService.getCartByUser(userId);
        if (!cart) {
            return res.status(404).json({ message: CONSTANTS.CART_NOT_FOUND });
        }
        res.status(200).json({ data: cart });
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
});

// Remove an item from the cart
const removeFromCart = catchAsync(async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user._id;
    if (!itemId) { return res.status(400).json({ message: "Item ID is missing." }) }
    try {
        const updatedCart = await CartService.removeFromCart(userId, itemId);
        res.status(200).json({ message: CONSTANTS.REMOVED_FROM_CART, updatedCart });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

// Update cart item quantity
const updateCartItem = catchAsync(async (req, res) => {
    const { itemId, quantity } = req.body;
    const userId = req.user._id;
    try {
        const updatedCart = await CartService.updateCartItem(userId, itemId, quantity);
        res.status(200).json({ message: CONSTANTS.CART_UPDATED, updatedCart });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clear the cart
const clearCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const cart = await CartService.clearCart(userId);
    if (!cart) { return res.status(404).json({ message: CONSTANTS.CART_NOT_FOUND }) }
    res.status(200).json({ message: CONSTANTS.CART_CLEARED, cart });
});

module.exports = {
    addToCart,
    getCart,
    removeFromCart,
    updateCartItem,
    clearCart
};