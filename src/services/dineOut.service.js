const { DineOutModel } = require('../models');

// Create a dine-out request
const createDineOutRequest = async (data) => {
    try {
        const newRequest = new DineOutModel(data);
        await newRequest.save();
        return newRequest;
    } catch (error) {
        throw new Error('Error creating dine-out request: ' + error.message);
    }
};

// Get a specific dine-out request by ID
const getDineOutRequestById = async (requestId) => {
    try {
        const request = await DineOutModel.findById(requestId)
            .populate('user', 'name')  // Populate user details
            .populate('business', 'businessName businessAddress openingDays openingTime closingTime');  // Populate business details
        if (!request) {
            throw new Error('Dine-out request not found');
        }
        return request;
    } catch (error) {
        throw new Error('Error fetching dine-out request: ' + error.message);
    }
};

// Get all dine-out requests for a specific business
const getDineOutRequestsForBusiness = async (businessId) => {
    try {
        const requests = await DineOutModel.find({ business: businessId })
            .populate('user', 'name email')  // Populate user details
            .populate('partner', 'name')  // Populate partner details
            .sort({ createdAt: -1 });  // Sort by creation date, latest first
        return requests;
    } catch (error) {
        throw new Error('Error fetching dine-out requests for business: ' + error.message);
    }
};

// Update the dine-out request status (Accept or Reject) and optionally generate a booking ID
const updateDineOutRequestStatus = async (requestId, status, bookingId = null) => {
    try {
        const updateFields = { status };
        if (status === 'Accepted' && bookingId) { updateFields.bookingId = bookingId }
        const updatedRequest = await DineOutModel.findByIdAndUpdate(
            requestId,
            updateFields,
            { new: true }
        ).populate('business');
        if (!updatedRequest) { throw new Error('Dine-out request not found') }
        return updatedRequest;
    } catch (error) {
        throw new Error('Error updating dine-out request status: ' + error.message);
    }
};

module.exports = {
    createDineOutRequest,
    getDineOutRequestById,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
};
