const { fetchInvoiceData } = require('../services/invoice.service');

const getInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Call the service function to get the invoice data
        const invoiceData = await fetchInvoiceData(orderId);

        // Respond with the invoice data
        res.status(200).json({ success: true, data: invoiceData });
    } catch (error) {
        console.error('Error fetching invoice:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Error fetching invoice' });
    }
};

module.exports = { getInvoice };