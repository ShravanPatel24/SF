const mongoose = require("mongoose");

// Variant schema for products
const variantSchema = new mongoose.Schema({
    variantName: { type: String, required: true }, // Name of the variant (e.g., "Small", "Medium", "Large")
    size: { type: String }, // Size of the variant
    color: { type: String }, // Color of the variant
    productPrice: { type: Number, required: true }, // Price of the variant
    nonReturnable: { type: Boolean, default: false }, // Non-returnable flag for the variant
    image: { type: String } // Image specific to the variant
});

// Main item schema
const itemSchema = new mongoose.Schema({
    itemType: {
        type: String,
        required: true,
        enum: ['food', 'room', 'product'] // Discriminating field for different types
    },
    images: [{ type: String }], // Images are common across all types
    available: { type: Boolean, default: true }, // Available toggle common across all
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' }, // Associated business
    businessType: { type: mongoose.Schema.Types.ObjectId, ref: 'businessType', required: true }, // Associated business type
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // Reference to the partner (user type = 'partner')

    // Category for items (refers to ItemCategory model)
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
        required: function () {
            return this.itemType !== 'room'; // Required for food and product, optional for room
        }
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
        required: function () {
            return this.itemType === 'product' || this.itemType === 'food'; // Required for product and food
        }
    },
    roomCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
        required: function () {
            return this.itemType === 'room'; // Required for room items
        }
    },
    // Fields for food items
    dishName: { type: String, required: function () { return this.itemType === 'food'; } },
    dishDescription: { type: String, required: function () { return this.itemType === 'food'; } },
    dishPrice: { type: Number, required: function () { return this.itemType === 'food'; } },
    foodDeliveryCharge: { type: Number, required: function () { return this.itemType === 'food'; } },

    // Fields for rooms
    roomName: { type: String, required: function () { return this.itemType === 'room'; } },
    roomDescription: { type: String, required: function () { return this.itemType === 'room'; } },
    roomPrice: { type: Number, required: function () { return this.itemType === 'room'; } },
    roomCapacity: { type: Number, required: function () { return this.itemType === 'room'; } },
    roomTax: { type: Number },
    checkIn: { type: Date, required: function () { return this.itemType === 'room'; } },
    checkOut: { type: Date, required: function () { return this.itemType === 'room'; } },
    amenities: [{ type: String }],

    // Fields for products
    productName: { type: String, required: function () { return this.itemType === 'product'; } },
    productDescription: { type: String, required: function () { return this.itemType === 'product'; } },
    productDeliveryCharge: { type: Number },
    variants: [variantSchema], // Use the variant schema here for multiple prices and variants
    productFeatures: [{ type: String }]
}, {
    timestamps: true
});

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;