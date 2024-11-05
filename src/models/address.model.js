const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const addressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    name: { type: String, required: true },
    countryCode: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
}, { timestamps: true });

addressSchema.plugin(mongoosePaginate);

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;
