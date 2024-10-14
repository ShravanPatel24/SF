const Joi = require('joi');

// Validation for creating an order
const createOrderValidation = Joi.object({
    cartId: Joi.string().required(),  // cartId should be required
    paymentMethod: Joi.string().valid('cash', 'online').required(),  // Only allow 'cash' or 'online'
    orderNote: Joi.string().optional()  // orderNote is optional
});

// Validation for updating order status
const updateOrderStatusValidation = Joi.object({
    status: Joi.string().valid('ordered', 'processing', 'out-for-delivery', 'delivered', 'cancelled')
        .required()
        .messages({
            'any.only': 'Invalid status. Valid statuses are: ordered, processing, out-for-delivery, delivered, and cancelled.',
            'any.required': 'Status is required.'
        }),
});

// Validation for cancelling an order
const cancelOrderValidation = Joi.object({
    reason: Joi.string().min(3).required(),
});

// Validation for tracking an order
const trackOrderValidation = Joi.object({
    orderId: Joi.string().required(),
});

module.exports = {
    createOrderValidation,
    updateOrderStatusValidation,
    cancelOrderValidation,
    trackOrderValidation
};