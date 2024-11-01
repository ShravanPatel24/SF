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
    totalPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    orderNote: { type: String },
    orderId: { type: String, unique: true, required: true },
    orderNumber: { type: String, unique: true, required: true },
    orderStatus: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'ordered', 'processing', 'pending_payment', 'paid', 'payment_failed', 'delivered', 'cancelled'],
        default: 'ordered'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'paypal', 'cash', 'online', 'bank_transfer'],
        required: true
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    transactionHistory: [
        {
            type: { type: String, required: true }, // 'Order Placed', 'Refund Requested', etc.
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            status: { type: String, required: true }, // 'Completed', 'Pending', etc.
            refundDetails: {
                amount: Number,
                reason: String,
                processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' } // Partner ID who processed the refund
            }
        }
    ]
}, { timestamps: true });

// Add plugins that convert mongoose to json, and handle pagination
orderSchema.plugin(toJSON);
orderSchema.plugin(mongoosePaginate);
orderSchema.plugin(aggregatePaginate);

const OrderModel = mongoose.model("Order", orderSchema);

module.exports = OrderModel;