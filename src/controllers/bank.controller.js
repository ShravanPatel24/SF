const { BankService } = require('../services');
const CONSTANTS = require('../config/constant');
const catchAsync = require('../utils/catchAsync');

// Create or update bank details for a partner
const createOrUpdateBankDetails = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const bankDetails = req.body;

    const result = await BankService.createOrUpdateBankDetails(partnerId, bankDetails);
    res.status(CONSTANTS.SUCCESSFUL).json({
        message: CONSTANTS.CREATED,
        bankDetails: result,
    });
});

// Update bank details for a partner
const updateBankDetails = catchAsync(async (req, res) => {
    const { bankId } = req.params;  // Getting user ID from userAuth middleware
    const bankDetails = req.body;    // Get new data to update from request body

    const updatedBankDetails = await BankService.updateBankDetails(bankId, bankDetails);
    res.status(CONSTANTS.SUCCESSFUL).json({
        message: CONSTANTS.UPDATED,
        bankDetails: updatedBankDetails,
    });
});

// Get bank details for a partner by userId
const getBankDetails = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    const bankDetails = await BankService.getBankDetailsByUserId(partnerId);
    res.status(CONSTANTS.SUCCESSFUL).json({
        message: CONSTANTS.FETCHED,
        bankDetails,
    });
});

// Delete bank details for a partner by userId
const deleteBankDetails = catchAsync(async (req, res) => {
    const partnerId = req.user._id;
    await BankService.deleteBankDetailsByUserId(partnerId);
    res.status(CONSTANTS.SUCCESSFUL).json({
        message: CONSTANTS.DELETED,
    });
});

module.exports = {
    createOrUpdateBankDetails,
    updateBankDetails,
    getBankDetails,
    deleteBankDetails,
};