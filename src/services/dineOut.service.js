const { DineOutModel } = require('../models');
const CONSTANTS = require('../config/constant');

// Create a dine-out request
const createDineOutRequest = async (data) => {
    try {
        const requestNumber = Math.floor(Date.now() / 1000).toString();
        const newRequestData = { ...data, requestNumber };
        const newRequest = new DineOutModel(newRequestData);
        await newRequest.save();
        return newRequest;
    } catch (error) {
        throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG + ': ' + error.message);
    }
};

// Get a specific dine-out request by ID
const getDineOutRequestById = async (requestId) => {
    try {
        const request = await DineOutModel.findById(requestId)
            .populate('user', 'name phone')
            .populate('partner', 'name email phone')
            .populate('business', 'businessName businessAddress openingDays openingTime closingTime');
        if (!request) {
            throw new Error(CONSTANTS.NOT_FOUND_MSG);
        }
        return request;
    } catch (error) {
        throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG + ': ' + error.message);
    }
};

// Get all dine-out requests for a specific business
const getDineOutRequestsForBusiness = async (businessId) => {
    try {
        const requests = await DineOutModel.find({ business: businessId })
            .populate('user', 'name email')
            .populate('partner', 'name')
            .sort({ createdAt: -1 });
        return requests;
    } catch (error) {
        throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG + ': ' + error.message);
    }
};

// Update the dine-out request status (Accept or Reject)
const updateDineOutRequestStatus = async (requestId, status, bookingId = null) => {
    try {
        const updateFields = { status };
        if (status === 'Accepted' && bookingId) { updateFields.bookingId = bookingId }
        const updatedRequest = await DineOutModel.findByIdAndUpdate(
            requestId,
            updateFields,
            { new: true }
        ).populate('business');
        if (!updatedRequest) { throw new Error(CONSTANTS.NOT_FOUND_MSG) }
        return updatedRequest;
    } catch (error) {
        throw new Error(CONSTANTS.INTERNAL_SERVER_ERROR_MSG + ': ' + error.message);
    }
};

module.exports = {
    createDineOutRequest,
    getDineOutRequestById,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
};