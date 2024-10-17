const mongoose = require("mongoose");
const { toJSON } = require("./plugins");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true },
        selectedSize: { type: String },
        selectedColor: { type: String }
    }],  // Store the items purchased in the order
    deliveryAddress: {
        name: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String },
        country: { type: String, required: true },
        postalCode: { type: String, required: true },
        phone: { type: String, required: true }
    },
    totalPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    orderNote: { type: String },
    orderId: { type: String, unique: true, required: true },  // Custom orderId
    orderNumber: { type: String, unique: true, required: true }, // Custom orderNumber
    status: {
        type: String,
        enum: ['ordered', 'processing', 'pending_payment', 'paid', 'payment_failed', 'delivered', 'cancelled'],
        default: 'ordered'  // Set default status as 'ordered'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'paypal', 'cash', 'online', 'bank_transfer'],
        required: true
    },
}, { timestamps: true });

// add plugin that converts mongoose to json
orderSchema.plugin(toJSON);
orderSchema.plugin(mongoosePaginate);
orderSchema.plugin(aggregatePaginate);

const OrderModel = mongoose.model("Order", orderSchema);

module.exports = OrderModel;