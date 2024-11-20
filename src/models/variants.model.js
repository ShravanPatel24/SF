const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const variantSchema = new mongoose.Schema(
    {
        variantName: { type: String, required: true }, // Name of the variant (e.g., "Large", "Medium")
        size: { type: String, required: true }, // Size of the variant
        color: { type: String, required: true }, // Color of the variant
        status: { type: Number, default: 1 }, // 1 = Active, 0 = Inactive
        isDelete: { type: Number, default: 1 } // 1 = Active, 0 = Deleted
    },
    { timestamps: true }
);

variantSchema.pre('find', function () {
    this.where({ isDelete: 1 });
});

variantSchema.pre('findOne', function () {
    this.where({ isDelete: 1 });
});

variantSchema.plugin(mongoosePaginate);

const Variant = mongoose.model('Variant', variantSchema);

module.exports = Variant;