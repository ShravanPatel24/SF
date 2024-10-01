const { DineOutRequestService } = require('../services');
const catchAsync = require('../utils/catchAsync');
const { UserModel, BusinessModel } = require('../models');

// Create a dine-out request
const createDineOutRequest = catchAsync(async (req, res) => {
    const { partnerId, businessId, date, time, guests, dinnerType } = req.body;
    const userId = req.user._id;
    const partner = await UserModel.findById(partnerId).where({ type: 'partner' });
    if (!partner) { return res.status(404).json({ message: 'Partner not found' }) }
    const newRequest = await DineOutRequestService.createDineOutRequest({
        user: userId,
        partner: partnerId,
        business: businessId,
        date,
        time,
        guests,
        dinnerType
    });
    res.status(201).json({ message: 'Dine-out request sent successfully', request: newRequest });
});

// Get all dine-out requests for a business
const getDineOutRequestsForBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    // Fetch the business to ensure the authenticated partner owns the business
    const business = await BusinessModel.findById(businessId);
    if (!business) { return res.status(404).json({ message: 'Business not found' }) }
    // Ensure the authenticated user (partner) is the owner of the business
    if (business.partner.toString() !== req.user._id.toString()) { return res.status(403).json({ message: 'You are not authorized to view the requests for this business' }) }
    // Fetch all dine-out requests for the business
    const requests = await DineOutRequestService.getDineOutRequestsForBusiness(businessId);
    if (!requests || requests.length === 0) { return res.status(404).json({ message: 'No dine-out requests found for this business' }) }
    res.status(200).json({ requests });
});

// Confirm the dine-out booking by the partner
const updateDineOutRequestStatus = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;
    // Fetch the dine-out request by ID
    const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);
    if (!dineOutRequest) { return res.status(404).json({ message: 'Dine-out request not found' }) }
    // Ensure the partner is the one accepting or rejecting the request
    if (dineOutRequest.partner._id.toString() !== req.user._id.toString()) { return res.status(403).json({ message: 'You are not authorized to update this request' }) }
    // Prevent modification to 'Rejected' if the status is already 'Accepted'
    if (dineOutRequest.status === 'Accepted' && status === 'Rejected') { return res.status(400).json({ message: 'You cannot change the status to Rejected after it has been Accepted' }) }
    // Generate a unique booking ID when the partner accepts the request
    let bookingId = null;
    if (status === 'Accepted') { bookingId = Math.floor(Date.now() / 1000).toString() }
    // Update the status and booking ID (if applicable)
    const updatedRequest = await DineOutRequestService.updateDineOutRequestStatus(requestId, status, bookingId);

    if (status === 'Accepted') {
        // Fetch the business details
        const business = await BusinessModel.findById(dineOutRequest.business);
        if (!business) { return res.status(404).json({ message: 'Business details not found' }) }
        // Respond with the booking ID and business details
        return res.status(200).json({
            message: 'Dine-out request accepted',
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
    if (status === 'Rejected') { return res.status(200).json({ message: 'Dine-out request rejected', request: updatedRequest }) }
})

module.exports = {
    createDineOutRequest,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
};
