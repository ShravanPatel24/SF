const { CartModel, ItemModel, UserModel } = require('../models');

// Add an item (food or product) to the cart
const addToCart = async (userId, productId, quantity, selectedSize, selectedColor, deliveryAddress) => {
    const product = await ItemModel.findById(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    let cart = await CartModel.findOne({ user: userId });
    if (!cart) {
        cart = new CartModel({ user: userId, items: [], deliveryAddress });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
        // Update quantity for existing item
        cart.items[itemIndex].quantity += quantity;
    } else {
        // Add new item to cart
        cart.items.push({
            product: productId,
            quantity,
            selectedSize: selectedSize || null,
            selectedColor: selectedColor || null,
        });
    }

    // Save the updated cart
    await cart.save();
    return cart;
};

// Get the cart for the current user
const getCartByUser = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) { throw new Error('User not found') }
    if (user.type === 'partner') { throw new Error('Partners are not allowed to access the cart functionality.') }
    const cart = await CartModel.findOne({ user: userId }).populate('items.product');
    return cart;
};

// Remove an item from the cart
const removeFromCart = async (userId, productId) => {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw new Error('Cart not found');

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) throw new Error('Item not found in cart');

    const itemPrice = cart.items[itemIndex].price;
    cart.totalPrice -= itemPrice;
    cart.items.splice(itemIndex, 1);

    await cart.save();
    return cart;
};

// Update the quantity of a cart item
const updateCartItem = async (userId, productId, quantity) => {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) throw new Error('Cart not found');

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) throw new Error('Item not found in cart');

    const product = await ItemModel.findById(productId);
    const oldPrice = cart.items[itemIndex].price;
    const newPrice = product.itemType === 'food' ? product.dishPrice * quantity : product.productPrice * quantity;

    cart.totalPrice += (newPrice - oldPrice);
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = newPrice;

    await cart.save();
    return cart;
};

// Clear the cart
const clearCart = async (userId) => {
    const cart = await CartModel.findOne({ user: userId });
    if (!cart) { throw new Error('Cart not found') }
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