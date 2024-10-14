const { CartModel, ItemModel, UserModel } = require('../models');
const CONSTANTS = require('../config/constant');

// Add an item (food, product or checkout for rooms) to the cart
const addToCart = async (userId, itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, deliveryAddress) => {
    const item = await ItemModel.findById(itemId);
    if (!item) { throw new Error(CONSTANTS.ITEM_NOT_FOUND); }

    // Find or create a cart for the user
    let cart = await CartModel.findOne({ user: userId });
    if (!cart) {
        cart = new CartModel({ user: userId, items: [], deliveryAddress });
    }

    // Check if the item is already in the cart
    const itemIndex = cart.items.findIndex(cartItem => cartItem.item.toString() === itemId);

    if (itemIndex > -1) {
        // If the item is a room, replace the existing booking with new dates
        if (item.itemType === 'room') {
            cart.items[itemIndex].checkIn = checkIn;
            cart.items[itemIndex].checkOut = checkOut;
            cart.items[itemIndex].quantity = 1;  // Keep the quantity as 1 for rooms
        } else {
            // For non-rooms (products/food), increase the quantity
            cart.items[itemIndex].quantity += quantity;
        }
    } else {
        // Add the new item to the cart
        cart.items.push({
            item: itemId,
            quantity: item.itemType === 'room' ? 1 : quantity,  // For rooms, quantity is always 1
            selectedSize,
            selectedColor,
            checkIn: item.itemType === 'room' ? checkIn : null,  // Only add checkIn for rooms
            checkOut: item.itemType === 'room' ? checkOut : null  // Only add checkOut for rooms
        });
    }

    await cart.save();
    return cart;
};

// Get the cart for the current user
const getCartByUser = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) { throw new Error(CONSTANTS.USER_NOT_FOUND); }
    if (user.type === 'partner') { throw new Error(CONSTANTS.PERMISSION_DENIED); }
    const cart = await CartModel.findOne({ user: userId }).populate('items.item');
    return cart;
};

// Remove an item from the cart
const removeFromCart = async (userId, cartItemId) => {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw new Error(CONSTANTS.CART_NOT_FOUND);

    if (cart.items.length === 0) { throw new Error(CONSTANTS.CART_EMPTY_MSG) }
    const itemIndex = cart.items.findIndex(cartItem => cartItem._id.toString() === cartItemId);
    if (itemIndex === -1) throw new Error(CONSTANTS.ITEM_NOT_FOUND);
    const itemPrice = cart.items[itemIndex].price || 0;
    cart.totalPrice -= itemPrice;
    cart.items.splice(itemIndex, 1);

    await cart.save();
    return cart;
};

// Update the quantity of a cart item
const updateCartItem = async (userId, itemId, quantity) => {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw new Error(CONSTANTS.CART_NOT_FOUND);
    const itemIndex = cart.items.findIndex(cartItem => cartItem._id.toString() === itemId);
    if (itemIndex === -1) throw new Error(CONSTANTS.ITEM_NOT_FOUND);
    const product = await ItemModel.findById(cart.items[itemIndex].item);
    if (!product) throw new Error("Product not found.");
    if (quantity <= 0) throw new Error(CONSTANTS.INVALID_QUANTITY);
    let newPrice;

    if (product.itemType === 'food') {
        newPrice = product.dishPrice * quantity;
    } else if (product.itemType === 'room') {
        newPrice = product.roomPrice * quantity;
    } else if (product.itemType === 'product') {
        const variant = product.variants.find(v => v.size === cart.items[itemIndex].selectedSize && v.color === cart.items[itemIndex].selectedColor);
        if (!variant) throw new Error(CONSTANTS.VARIANT_NOT_FOUND);
        newPrice = variant.productPrice * quantity;
    } else {
        throw new Error(CONSTANTS.INVALID_ITEM_TYPE);
    }
    if (isNaN(newPrice) || newPrice <= 0) throw new Error(CONSTANTS.INVALID_PRICE);
    const oldPrice = cart.items[itemIndex].price || 0;
    cart.totalPrice = cart.totalPrice - oldPrice + newPrice;
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = newPrice;

    await cart.save();
    return cart;
};

// Clear the cart
const clearCart = async (userId) => {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) { throw new Error(CONSTANTS.CART_NOT_FOUND) }
    cart.items = [];
    cart.totalPrice = 0;
    cart.subtotal = 0;
    cart.tax = 0;
    cart.deliveryCharge = 0;
    await cart.save();
    return cart;
};

module.exports = {
    addToCart,
    getCartByUser,
    removeFromCart,
    updateCartItem,
    clearCart
};