const mongoose = require("mongoose");

const itemCategorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    categoryType: {
        type: String,
        required: true,
        enum: ['product', 'food', 'room']  // Specify valid types
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemCategory',
        default: null,
        validate: {
            validator: function () {
                // Allow parentCategory to be null for room types
                return this.categoryType !== 'room' || this.parentCategory === null;
            },
            message: "Parent category is not allowed for room types."
        }
    },
    status: { type: Number, default: 1 }, //0 is Inactive, 1 is Active
    isDelete: { type: Number, default: 1 }
}, {
    timestamps: true
});

const ItemCategoryModel = mongoose.model("ItemCategory", itemCategorySchema);

module.exports = ItemCategoryModel;
