const { OrderModel } = require('../models');

const fetchInvoiceData = async (orderId) => {
    // Fetch the order details from the database
    const order = await OrderModel.findById(orderId)
        .populate('user', 'name email phone')
        .populate({
            path: 'items.item',
            select: 'itemType dishName dishPrice roomName roomPrice productName variants.productPrice',
        });

    if (!order) {
        throw new Error('Order not found');
    }

    // Prepare and return the invoice data
    return {
        invoiceNumber: order.orderNumber,
        createdAt: new Date(order.createdAt).toLocaleDateString(),
        customer: {
            name: order.user?.name,
            phone: order.user?.phone,
            email: order.user?.email,
        },
        deliveryAddress: order.deliveryAddress || {},
        shippingAddress: order.shippingAddress || order.deliveryAddress || {},
        items: order.items.map((item) => ({
            description: item.item?.productName || item.item?.dishName || item.item?.roomName || 'N/A',
            qty: item.quantity || 0,
            unitPrice:
                item.item?.variants?.[0]?.productPrice || item.item?.dishPrice || item.item?.roomPrice || 0,
            total: (item.quantity || 0) * (item.item?.dishPrice || item.item?.roomPrice || 0),
        })),
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        total: order.totalPrice || 0,
    };
};

module.exports = { fetchInvoiceData };