const express = require('express');
const router = express.Router();
const { getInvoice } = require('../../controllers/invoice.controller');

// Route to get the invoice data
router.get('/:orderId', getInvoice);

module.exports = router;