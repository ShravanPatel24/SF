const mongoose = require("mongoose");
const { toJSON } = require("./plugins");
const mongoosePaginate = require("mongoose-paginate-v2");
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
    businessType: { type: mongoose.Schema.Types.ObjectId, ref: 'businessType' },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, required: true },
        checkIn: { type: Date }, // Added field for user's check-in date
        checkOut: { type: Date }, // Added field for user's check-out date
        selectedSize: { type: String },
        selectedColor: { type: String },
        guestCount: { type: Number },
    }],
    deliveryAddress: {
        name: { type: String, required: function () { return this.requiresDeliveryAddress(); } },
        street: { type: String, required: function () { return this.requiresDeliveryAddress(); } },
        city: { type: String, required: function () { return this.requiresDeliveryAddress(); } },
        state: { type: String },
        country: { type: String, required: function () { return this.requiresDeliveryAddress(); } },
        postalCode: { type: String, required: function () { return this.requiresDeliveryAddress(); } },
        phone: { type: String, required: function () { return this.requiresDeliveryAddress(); } }
    },
    totalPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true },
    commission: { type: Number, required: true, default: 0 },
    orderNote: { type: String },
    orderId: { type: String, unique: true, required: true },
    orderNumber: { type: String, unique: true, required: true },
    deliveryPartner: {
        name: { type: String },
        phone: { type: String },
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'ordered', 'processing', 'out_for_delivery', 'pending_payment', 'paid', 'payment_failed', 'delivered', 'cancelled', 'completed'],
        default: 'ordered'
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'paypal', 'cash', 'online', 'bank_transfer'],
        required: true
    },
    transactionHistory: [{
        type: { type: String, required: true },
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        status: { type: String, required: true }
    }],
    refundDetails: {
        reason: { type: String },
        status: { type: String, enum: ['pending_partner', 'pending_admin', 'approved', 'rejected'] },
        requestedDate: { type: Date },
        approvedDate: { type: Date },
        amount: { type: Number },
        bankDetails: {
            country: { type: String },
            bankName: { type: String },
            accountName: { type: String },
            accountNumber: { type: String },
            ifscCode: { type: String }
        }
    },
    exchangeDetails: [{
        reason: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        requestedDate: { type: Date },
        approvedDate: { type: Date },
        newProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }
    }]
}, { timestamps: true });

// Helper method to determine if delivery address is required
orderSchema.methods.requiresDeliveryAddress = function () {
    return this.items.some(item => item.itemType === 'food' || item.itemType === 'product');
};

orderSchema.plugin(toJSON);
orderSchema.plugin(mongoosePaginate);
orderSchema.plugin(aggregatePaginate);

const OrderModel = mongoose.model("Order", orderSchema);

module.exports = OrderModel;