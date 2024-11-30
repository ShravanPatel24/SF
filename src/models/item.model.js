const mongoose = require('mongoose');

// Main item schema
const itemSchema = new mongoose.Schema(
    {
        itemType: {
            type: String,
            required: true,
            enum: ['food', 'room', 'product']
        },
        quantity: {
            type: Number,
            required: function () {
                return this.itemType === 'food' || this.itemType === 'room';
            },
            min: [1, 'Quantity must be at least 1'],
        },
        images: [{ type: String }],
        available: { type: Boolean, default: true },
        business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
        businessType: { type: mongoose.Schema.Types.ObjectId, ref: 'businessType', required: true },
        partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ItemCategory',
            validate: {
                validator: function () {
                    return this.itemType !== 'room';
                },
                message: 'Parent category is required for non-room items.'
            }
        },
        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ItemCategory',
            required: function () {
                return this.itemType === 'product' || this.itemType === 'food';
            }
        },
        roomCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ItemCategory',
            required: function () {
                return this.itemType === 'room';
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
        productFeatures: [{ type: String }],
        nonReturnable: { type: Boolean, default: false },
        variants: {
            type: [
                {
                    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
                    productPrice: { type: Number, required: true },
                    quantity: { type: Number, required: true }, // Quantity for this specific product-variant pair
                    image: { type: String }
                }
            ],
            default: []
        }
    },
    { timestamps: true }
);

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;