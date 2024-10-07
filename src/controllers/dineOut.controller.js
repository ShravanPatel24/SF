const { DineOutRequestService } = require('../services');
const CONSTANTS = require('../config/constant');
const catchAsync = require('../utils/catchAsync');
const { UserModel, BusinessModel } = require('../models');

// Create a dine-out request
const createDineOutRequest = catchAsync(async (req, res) => {
    const { partnerId, businessId, date, time, guests, dinnerType } = req.body;
    const userId = req.user._id;

    if (req.user.type === 'partner') { return res.status(CONSTANTS.UNAUTHORIZED).json({ message: CONSTANTS.PERMISSION_DENIED }) }

    const partner = await UserModel.findById(partnerId).where({ type: 'partner' });
    if (!partner) { return res.status(CONSTANTS.NOT_FOUND).json({ message: CONSTANTS.PARTNER_NOT_FOUND_MSG }) }

    const newRequest = await DineOutRequestService.createDineOutRequest({
        user: userId,
        partner: partnerId,
        business: businessId,
        date,
        time,
        guests,
        dinnerType
    });
    res.status(CONSTANTS.SUCCESSFUL).json({ message: CONSTANTS.CREATED, request: newRequest, requestNumber: newRequest.requestNumber });
});

// Get a specific dine-out request by ID
const getDineOutRequestById = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    if (req.user.type !== 'partner') { return res.status(CONSTANTS.UNAUTHORIZED).json({ message: CONSTANTS.PERMISSION_DENIED }) }

    const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);
    if (!dineOutRequest) { return res.status(CONSTANTS.NOT_FOUND).json({ message: CONSTANTS.DINEOUT_NOT_FOUND }) }

    res.status(CONSTANTS.SUCCESSFUL).json({
        message: CONSTANTS.DETAILS,
        data: { ...dineOutRequest._doc, requestNumber: dineOutRequest.requestNumber, mobile: dineOutRequest.user.phone }
    });
});

// Get all dine-out requests for a business
const getDineOutRequestsForBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const business = await BusinessModel.findById(businessId);
    if (!business) { return res.status(CONSTANTS.NOT_FOUND).json({ message: CONSTANTS.BUSINESS_NOT_FOUND }) }
    if (business.partner.toString() !== req.user._id.toString()) { return res.status(CONSTANTS.UNAUTHORIZED).json({ message: CONSTANTS.PERMISSION_DENIED }) }
    const requests = await DineOutRequestService.getDineOutRequestsForBusiness(businessId);
    if (!requests || requests.length === 0) { return res.status(CONSTANTS.NOT_FOUND).json({ message: CONSTANTS.NOT_FOUND_MSG }) }
    res.status(CONSTANTS.SUCCESSFUL).json({ requests });
});

// Confirm the dine-out booking by the partner
const updateDineOutRequestStatus = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;
    const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);
    if (!dineOutRequest) { return res.status(CONSTANTS.NOT_FOUND).json({ message: CONSTANTS.DINEOUT_NOT_FOUND }) }
    if (dineOutRequest.partner._id.toString() !== req.user._id.toString()) { return res.status(CONSTANTS.UNAUTHORIZED).json({ message: CONSTANTS.PERMISSION_DENIED }) }
    if (dineOutRequest.status === 'Accepted' && status === 'Rejected') { return res.status(CONSTANTS.BAD_REQUEST).json({ message: CONSTANTS.REJECT_AFTER_ACCEPTED }) }
    let bookingId = null;
    if (status === 'Accepted') { bookingId = Math.floor(Date.now() / 1000).toString(); }
    const updatedRequest = await DineOutRequestService.updateDineOutRequestStatus(requestId, status, bookingId);

    if (status === 'Accepted') {
        const business = await BusinessModel.findById(dineOutRequest.business);
        if (!business) { return res.status(CONSTANTS.NOT_FOUND).json({ message: CONSTANTS.BUSINESS_NOT_FOUND }) }
        return res.status(CONSTANTS.SUCCESSFUL).json({
            message: CONSTANTS.DINEOUT_REQUEST_ACCEPTED,
            bookingId,
            businessDetails: {
                businessName: business.businessName,
                address: business.businessAddress,
                openingDays: business.openingDays,
                openingTime: business.openingTime,
                closingTime: business.closingTime,
            }
        });
    }
    if (status === 'Rejected') { return res.status(CONSTANTS.SUCCESSFUL).json({ message: CONSTANTS.DINEOUT_REQUEST_REJECTED, request: updatedRequest }) }
});

module.exports = {
    createDineOutRequest,
    getDineOutRequestById,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
};