const catchAsync = require('../utils/catchAsync');
const CartService = require('../services/cart.service');
const { ItemModel } = require('../models');

// Add an item (food or product) to the cart
const addToCart = catchAsync(async (req, res) => {
    const { productId, quantity, selectedSize, selectedColor, deliveryAddress } = req.body;
    const userId = req.user._id;

    const product = await ItemModel.findById(productId);
    if (!product) { return res.status(404).json({ message: 'Product not found' }) }

    // Validate product price and set it for food or product items
    const pricePerUnit = product.price || product.dishPrice || 0;
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) { return res.status(400).json({ message: 'Invalid price for the product' }) }
    if (quantity <= 0) { return res.status(400).json({ message: 'Quantity must be greater than 0' }) }

    const cart = await CartService.addToCart(userId, productId, quantity, selectedSize, selectedColor, deliveryAddress);
    res.status(200).json({ message: 'Product added to cart successfully', cart });
});

// Get the current user's cart
const getCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    try {
        const cart = await CartService.getCartByUser(userId);
        if (!cart) { return res.status(404).json({ message: 'Cart not found' }) }
        res.status(200).json({ data: cart });
    } catch (error) {
        res.status(403).json({ message: error.message });
    }
});

// Remove an item from the cart
const removeFromCart = catchAsync(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user._id;

    const updatedCart = await CartService.removeFromCart(userId, productId);
    res.status(200).json({ message: 'Item removed from cart', updatedCart });
});

// Update cart item quantity
const updateCartItem = catchAsync(async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    const updatedCart = await CartService.updateCartItem(userId, productId, quantity);
    res.status(200).json({ message: 'Cart item updated', updatedCart });
});

// Clear the cart
const clearCart = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const cart = await CartService.clearCart(userId);
    if (!cart) { return res.status(404).json({ message: 'Cart not found' }) }
    res.status(200).json({ message: 'Cart cleared successfully', cart });
});

module.exports = {
    addToCart,
    getCart,
    removeFromCart,
    updateCartItem,
    clearCart
};