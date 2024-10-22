const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestId: { type: String },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true }, // Unified field for room, food, or product
        quantity: { type: Number, required: true, min: 1 }, // For rooms, this could represent the number of nights
        selectedSize: { type: String }, // Optional for room bookings, can be omitted
        selectedColor: { type: String }, // Optional for room bookings, can be omitted
        checkIn: { type: Date }, // Check-in date for room bookings
        checkOut: { type: Date }, // Check-out date for room bookings
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
    deliveryCharge: { type: Number, required: true, default: 0 },  // Delivery charge (can be set to 0 for hotel bookings)
    totalPrice: { type: Number, required: true, default: 0 },  // Total price for the cart (subtotal + tax + delivery charge)
}, {
    timestamps: true
});

// Middleware for calculating subtotal, tax, and total price (for rooms, food, or products)
cartSchema.pre('save', async function (next) {
    let subtotal = 0;
    let totalDeliveryCharge = 0;

    // Loop through the cart items to calculate subtotal and delivery charge
    for (let item of this.items) {
        const product = await mongoose.model('Item').findById(item.item);  // Unified 'item' field for rooms, food, or products
        if (!product) { return next(new Error('Item not found.')) }

        let pricePerUnit = 0;
        let itemDeliveryCharge = 0;

        if (product.itemType === 'room') {
            // Calculate room price based on number of nights
            const checkIn = new Date(item.checkIn);
            const checkOut = new Date(item.checkOut);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)); // Calculate the number of nights
            pricePerUnit = product.roomPrice * nights;
            itemDeliveryCharge = 0; // No delivery charge for room bookings
        } else if (product.itemType === 'food') {
            pricePerUnit = product.dishPrice || 0;
            itemDeliveryCharge = product.foodDeliveryCharge || 0;
        } else if (product.itemType === 'product') {
            const variant = product.variants.find(v => v.size === item.selectedSize && v.color === item.selectedColor);
            pricePerUnit = variant ? variant.productPrice : 0;
            itemDeliveryCharge = product.productDeliveryCharge || 0;
        }

        if (isNaN(pricePerUnit) || pricePerUnit <= 0) { return next(new Error('Invalid price for the item.')) }

        // Calculate the price for the item and add it to the subtotal
        item.price = pricePerUnit * item.quantity;
        subtotal += item.price;
        totalDeliveryCharge += itemDeliveryCharge;
    }

    // Calculate subtotal and tax
    this.subtotal = subtotal;
    this.tax = this.subtotal * 0.05; // Example 5% tax
    this.deliveryCharge = totalDeliveryCharge; // Delivery charge for all items
    this.totalPrice = this.subtotal + this.tax + this.deliveryCharge;

    next();
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;