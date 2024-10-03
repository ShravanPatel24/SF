const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true, min: 1 },
        selectedSize: { type: String },
        selectedColor: { type: String },
    }],
    deliveryAddress: {
        name: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String },
        country: { type: String, required: true },
        postalCode: { type: String, required: true },
        phone: { type: String, required: true }
    },
    subtotal: { type: Number, required: true, default: 0 },  // Subtotal for the cart
    tax: { type: Number, required: true, default: 0 },  // Tax on the items
    deliveryCharge: { type: Number, required: true, default: 0 },  // Delivery charge
    totalPrice: { type: Number, required: true, default: 0 },  // Total price for the cart (subtotal + tax + delivery charge)
}, {
    timestamps: true
});

// Middleware to calculate subtotal, tax, and total price before saving
cartSchema.pre('save', async function (next) {
    let subtotal = 0;
    for (let item of this.items) {
        const product = await mongoose.model('Item').findById(item.product);
        if (product.itemType === 'food') {
            item.price = product.dishPrice * item.quantity;
        } else if (product.itemType === 'room') {
            item.price = product.roomPrice * item.quantity;
        } else if (product.itemType === 'product') {
            item.price = product.productPrice * item.quantity;
        }
        subtotal += item.price;
    }
    // Calculate subtotal
    this.subtotal = subtotal;
    // Example tax rate (5%)
    this.tax = this.subtotal * 0.05;
    // Example delivery charge logic (flat rate of 5 AED or customizable)
    this.deliveryCharge = 5;
    // Calculate total price (subtotal + tax + delivery charge)
    this.totalPrice = this.subtotal + this.tax + this.deliveryCharge;
    next();
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
