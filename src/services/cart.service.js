const { CartModel, ItemModel, UserModel } = require('../models');
const CONSTANTS = require('../config/constant');

// Add an item (food, product or checkout for rooms) to the cart
const addToCart = async (userId, itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, guestCount, deliveryAddress) => {
    const item = await ItemModel.findById(itemId);
    if (!item) {
        throw new Error(CONSTANTS.ITEM_NOT_FOUND);
    }

    // Check if delivery address is required for product and food
    if ((item.itemType === 'product' || item.itemType === 'food') && !deliveryAddress) {
        throw new Error(CONSTANTS.DELIVERY_ADDRESS_REQUIRED);
    }

    // Validate dates for rooms
    if (item.itemType === 'room') {
        if (!checkIn || !checkOut || !guestCount || guestCount <= 0) {
            throw new Error(CONSTANTS.CHECKIN_CHECKOUT_GUEST_REQUIRED);
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const today = new Date();

        if (checkInDate < today || checkOutDate < today) {
            throw new Error(CONSTANTS.INVALID_FUTURE_DATES);
        }

        if (checkInDate >= checkOutDate) {
            throw new Error(CONSTANTS.INVALID_DATE_ORDER);
        }

        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            throw new Error(CONSTANTS.INVALID_DATES);
        }

        let pricePerUnit = item.roomPrice * nights;
        if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
            throw new Error(CONSTANTS.INVALID_PRICE);
        }
    }

    // Find or create a cart for the user
    let cart = await CartModel.findOne({ user: userId });
    if (!cart) {
        // For rooms, set delivery address to null; otherwise, use the provided address
        cart = new CartModel({
            user: userId,
            items: [],
            deliveryAddress: item.itemType === 'room' ? null : deliveryAddress
        });
    }

    // Check if the item is already in the cart
    const itemIndex = cart.items.findIndex(cartItem => cartItem.item.toString() === itemId);

    if (itemIndex > -1) {
        // If the item is a room, replace the existing booking with new dates and guest count
        if (item.itemType === 'room') {
            cart.items[itemIndex].checkIn = checkIn;
            cart.items[itemIndex].checkOut = checkOut;
            cart.items[itemIndex].guestCount = guestCount;
            cart.items[itemIndex].quantity = 1; 
        } else {
            cart.items[itemIndex].quantity += quantity;
        }
    } else {
        // Add the new item to the cart
        cart.items.push({
            item: itemId,
            quantity: item.itemType === 'room' ? 1 : quantity,
            selectedSize,
            selectedColor,
            checkIn: item.itemType === 'room' ? checkIn : null,
            checkOut: item.itemType === 'room' ? checkOut : null,
            guestCount: item.itemType === 'room' ? guestCount : null
        });
    }

    await cart.save();
    return cart;
};

// Get the cart for the current user
const getCartByUser = async (userId) => {
    const user = await UserModel.findById(userId);
    if (!user) { throw new Error(CONSTANTS.USER_NOT_FOUND) }
    if (user.type === 'partner') { throw new Error(CONSTANTS.PERMISSION_DENIED) }
    const cart = await CartModel.findOne({ user: userId })
        .populate({
            path: 'items.item',
            populate: [
                {
                    path: 'business',
                    select: '_id businessName',
                },
                {
                    path: 'businessType',
                    select: '_id name',
                }
            ]
        });
    if (!cart) { throw new Error(CONSTANTS.CART_NOT_FOUND) }
    const cartData = cart.toObject();
    cartData.items = cartData.items.map(item => {
        const modifiedItem = {
            ...item,
            item: {
                ...item.item,
                businessId: item.item.business._id,
                businessName: item.item.business.businessName,
                businessTypeId: item.item.businessType._id,
                businessTypeName: item.item.businessType.name
            },
            guestCount: item.guestCount
        };

        delete modifiedItem.item.business;
        delete modifiedItem.item.businessType;
        delete modifiedItem._id;

        return modifiedItem;
    });
    return cartData;
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
    if (!cart) { throw { statusCode: 404, message: CONSTANTS.CART_NOT_FOUND } }
    cart.items = [];
    cart.totalPrice = 0;
    cart.subtotal = 0;
    cart.tax = 0;
    cart.deliveryCharge = 0;
    await cart.save();
    return cart;
};

// Add an item to the cart (for guests)
const addGuestToCart = async (cartId, itemId, quantity, selectedSize, selectedColor, checkIn, checkOut, deliveryAddress) => {
    const item = await ItemModel.findById(itemId);
    if (!item) {
        throw new Error(CONSTANTS.ITEM_NOT_FOUND);
    }

    // Find or create a cart for the guest (identified by guestId)
    let cart = await CartModel.findOne({ guestId: cartId });
    if (!cart) {
        // Create a new cart for the guest without user
        cart = new CartModel({
            guestId: cartId,
            items: [],
            deliveryAddress: deliveryAddress, // Use provided deliveryAddress
            subtotal: 0,
            tax: 0,
            deliveryCharge: 0,
            totalPrice: 0
        });
    }

    // Check if the item is already in the cart
    const itemIndex = cart.items.findIndex(cartItem => cartItem.item.toString() === itemId);

    if (itemIndex > -1) {
        // Update existing item logic
        cart.items[itemIndex].quantity += item.itemType === 'room' ? 1 : quantity; // Increment quantity for rooms or set quantity
        cart.items[itemIndex].checkIn = item.itemType === 'room' ? checkIn : cart.items[itemIndex].checkIn; // Update check-in date if it's a room
        cart.items[itemIndex].checkOut = item.itemType === 'room' ? checkOut : cart.items[itemIndex].checkOut; // Update check-out date if it's a room
    } else {
        // Add the new item to the cart
        cart.items.push({
            item: itemId,
            quantity: item.itemType === 'room' ? 1 : quantity, // For rooms, quantity is always 1
            selectedSize,
            selectedColor,
            checkIn: item.itemType === 'room' ? checkIn : null, // Only add checkIn for rooms
            checkOut: item.itemType === 'room' ? checkOut : null  // Only add checkOut for rooms
        });
    }

    // Save the updated cart
    await cart.save();
    return cart;
};

// Get the cart for the guest
const getGuestCart = async (guestId) => { // Parameter name
    const cart = await CartModel.findOne({ guestId: guestId }) // Correct usage of guestId
        .populate({
            path: 'items.item',
            populate: {
                path: 'partner',
                select: '_id name'
            }
        });

    if (!cart) {
        throw new Error(CONSTANTS.CART_NOT_FOUND);
    }
    return cart;
};

// Remove an item from the guest cart
const removeFromGuestCart = async (guestId, cartItemId) => {
    const cart = await CartModel.findOne({ guestId });
    if (!cart) throw new Error(CONSTANTS.CART_NOT_FOUND);
    const itemIndex = cart.items.findIndex(cartItem => cartItem._id.toString() === cartItemId);
    if (itemIndex === -1) throw new Error(CONSTANTS.ITEM_NOT_FOUND);

    cart.items.splice(itemIndex, 1);
    await cart.save();
    return cart;
};

// Clear the guest cart
const clearGuestCart = async (guestId) => {
    const cart = await CartModel.findOne({ guestId: guestId });
    if (!cart) { throw { statusCode: 404, message: CONSTANTS.CART_NOT_FOUND } }
    cart.items = [];
    await cart.save();
    return cart;
};

module.exports = {
    addToCart,
    getCartByUser,
    removeFromCart,
    updateCartItem,
    clearCart,
    addGuestToCart,
    getGuestCart,
    removeFromGuestCart,
    clearGuestCart
};