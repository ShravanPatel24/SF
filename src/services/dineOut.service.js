const { DineOutModel, BusinessModel } = require('../models');
const CONSTANTS = require('../config/constant');
const moment = require('moment');

// Check Time Slot Availability
const checkTimeSlotAvailability = async (businessId, date, time) => {
    const business = await BusinessModel.findById(businessId);
    if (!business || !business.dineInStatus) { throw new Error('Business not found or dine-in is not available') }
    const operatingDetail = business.operatingDetails.find(detail => detail.date === date);
    if (!operatingDetail) { throw new Error('The business is not operating on the selected date.') }
    const requestedDateTime = moment(`${date}T${time}`, 'YYYY-MM-DDTHH:mm:ssZ');  // Requested time
    const startTime = moment(operatingDetail.startTime).utc(); // Convert start time from DB to UTC
    const endTime = moment(operatingDetail.endTime).utc();     // Convert end time from DB to UTC
    if (requestedDateTime.isBefore(startTime) || requestedDateTime.isAfter(endTime)) { throw new Error('Selected time slot is not available.') }
    return true;
};

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
    checkTimeSlotAvailability,
    createDineOutRequest,
    getDineOutRequestById,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
};