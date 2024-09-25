const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

const businessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    businessType: { type: mongoose.Schema.Types.ObjectId, ref: 'businessType', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    details: { type: String, default: "" },
    images: [{ type: String }],
    status: { type: Number, default: 1 },
}, {
    timestamps: true,
});

businessSchema.plugin(mongoosePaginate);

const BusinessDetail = mongoose.model('Business', businessSchema);
module.exports = BusinessDetail;
