const mongoose = require("mongoose");

// Variant schema for products
const variantSchema = new mongoose.Schema({
    variantName: { type: String, required: true }, // Name of the variant (e.g., "Small", "Medium", "Large")
    size: { type: String }, // Size of the variant
    color: { type: String }, // Color of the variant
    productPrice: { type: Number, required: true }, // Price of the variant
    nonReturnable: { type: Boolean, default: false }, // Non-returnable flag for the variant
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
    // Fields for food menu
    dishName: { type: String },
    dishDescription: { type: String },
    dishPrice: { type: Number }, // Default price for food
    // Fields for rooms
    roomName: { type: String },
    roomType: { type: String },
    roomDescription: { type: String },
    roomPrice: { type: Number }, // Default price for rooms
    roomTax: { type: Number },
    checkIn: { type: String },
    checkOut: { type: String },
    amenities: [{ type: String }],
    // Fields for products
    productName: { type: String },
    productCategory: { type: String },
    productDescription: { type: String },
    variants: [variantSchema], // Use the variant schema here for multiple prices and variants
    // New operating details for food items
    dineInStatus: { type: Boolean, default: false },
    operatingDetails: [{
        date: { type: String },
        startTime: { type: String },
        endTime: { type: String }
    }],
    tableManagement: [{
        tableNumber: { type: String },
        seatingCapacity: { type: Number }
    }],
}, {
    timestamps: true
});

// Pre-save hook to handle dineInStatus logic
itemSchema.pre('save', function (next) {
    if (!this.dineInStatus) {
        // If dineInStatus is false but operatingDetails or tableManagement are provided, throw an error
        if (this.operatingDetails.length > 0 || this.tableManagement.length > 0) {
            return next(new Error('Operating details and table management cannot be provided when dineInStatus is false.'));
        }
        // Clear these fields if dineInStatus is false
        this.operatingDetails = [];
        this.tableManagement = [];
    }
    next();
});

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;