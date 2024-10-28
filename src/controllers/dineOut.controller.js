const { DineOutRequestService } = require('../services');
const CONSTANTS = require('../config/constant');
const catchAsync = require('../utils/catchAsync');
const { UserModel, BusinessModel } = require('../models');
const moment = require('moment');

// Check Time Slot Availability
const checkTimeSlot = catchAsync(async (req, res) => {
    const { businessId, date, time } = req.body;
    try {
        await DineOutRequestService.checkTimeSlotAvailability(businessId, date, time);
        res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: 'Time slot is available' });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Create a dine-out request
const createDineOutRequest = catchAsync(async (req, res) => {
    const { partnerId, businessId, date, time, guests, dinnerType } = req.body;
    const userId = req.user._id;
    try {
        if (req.user.type === 'partner') { return res.status(CONSTANTS.UNAUTHORIZED).json({ statusCode: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PERMISSION_DENIED }) }
        // Check if the partner exists
        const partner = await UserModel.findById(partnerId).where({ type: 'partner' });
        if (!partner) { return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.PARTNER_NOT_FOUND_MSG }) }
        // Check if the selected business ID is associated with the partner
        const business = await BusinessModel.findById(businessId);
        if (!business || business.partner.toString() !== partnerId) { return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.BUSINESS_NOT_ASSOCOATED_WITH_PARTNER }) }
        // Check if dine-out feature is enabled for the selected business
        if (!business.dineInStatus) { return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.DINEOUT_DISABLED }) }

        // Check time slot availability
        await DineOutRequestService.checkTimeSlotAvailability(businessId, date, time);

        const dineOutDateTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm').utc().toDate();
        const newRequest = await DineOutRequestService.createDineOutRequest({
            user: userId,
            partner: partnerId,
            business: businessId,
            date: dineOutDateTime,
            time,
            guests,
            dinnerType
        });

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.CREATED,
            request: newRequest,
            requestNumber: newRequest.requestNumber
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: error.message });
    }
});

// Get a specific dine-out request by ID
const getDineOutRequestById = catchAsync(async (req, res) => {
    const { requestId } = req.params;

    if (req.user.type !== 'partner') { return res.status(CONSTANTS.UNAUTHORIZED).json({ statusCode: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PERMISSION_DENIED }) }

    const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);

    if (!dineOutRequest) { return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.DINEOUT_NOT_FOUND }) }
    const responseData = {
        requestNumber: dineOutRequest.requestNumber,
        status: dineOutRequest.status,
        mobile: dineOutRequest.user.phone,
        user: {
            name: dineOutRequest.user.name,
            email: dineOutRequest.user.email,
        },
        partner: {
            name: dineOutRequest.partner.name,
        },
        business: {
            businessName: dineOutRequest.business.businessName,
            businessAddress: dineOutRequest.business.businessAddress,
            openingDays: dineOutRequest.business.openingDays,
            openingTime: dineOutRequest.business.openingTime,
            closingTime: dineOutRequest.business.closingTime,
        },
    };
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.DETAILS,
        data: responseData,
    });
});

// Get all dine-out requests for a business
const getDineOutRequestsForBusiness = catchAsync(async (req, res) => {
    const { businessId } = req.params;
    const business = await BusinessModel.findById(businessId);
    if (!business) {
        return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.BUSINESS_NOT_FOUND });
    }
    if (business.partner.toString() !== req.user._id.toString()) {
        return res.status(CONSTANTS.UNAUTHORIZED).json({ statusCode: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PERMISSION_DENIED });
    }
    const requests = await DineOutRequestService.getDineOutRequestsForBusiness(businessId);
    if (!requests || requests.length === 0) {
        return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.NOT_FOUND_MSG });
    }
    res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, requests });
});

// Confirm the dine-out booking by the partner
const updateDineOutRequestStatus = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;

    try {
        const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);

        if (!dineOutRequest) { return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.DINEOUT_NOT_FOUND }) }

        if (dineOutRequest.partner._id.toString() !== req.user._id.toString()) { return res.status(CONSTANTS.UNAUTHORIZED).json({ statusCode: CONSTANTS.UNAUTHORIZED, message: CONSTANTS.PERMISSION_DENIED }) }

        if (dineOutRequest.status === 'Accepted' && status === 'Rejected') { return res.status(CONSTANTS.BAD_REQUEST).json({ statusCode: CONSTANTS.BAD_REQUEST, message: CONSTANTS.REJECT_AFTER_ACCEPTED }) }

        let bookingId = null;
        if (status === 'Accepted') { bookingId = Math.floor(Date.now() / 1000).toString() }
        const updatedRequest = await DineOutRequestService.updateDineOutRequestStatus(requestId, status, bookingId);
        if (status === 'Accepted') {
            const business = await BusinessModel.findById(dineOutRequest.business);
            if (!business) {
                return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.BUSINESS_NOT_FOUND });
            }
            return res.status(CONSTANTS.SUCCESSFUL).json({
                statusCode: CONSTANTS.SUCCESSFUL,
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
        if (status === 'Rejected') {
            return res.status(CONSTANTS.SUCCESSFUL).json({
                statusCode: CONSTANTS.SUCCESSFUL,
                message: CONSTANTS.DINEOUT_REQUEST_REJECTED,
                request: updatedRequest
            });
        }
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An internal server error has occurred.'
        });
    }
});

// Get all dine-out requests for admin
const getAllDineOutRequests = catchAsync(async (req, res) => {
    const { page, limit, search, sortBy, sortOrder, status } = req.query;
    try {
        const result = await DineOutRequestService.getAllDineOutRequests({
            page,
            limit,
            search,
            sortBy,
            sortOrder,
            status
        });
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            data: result,
            message: CONSTANTS.LIST
        });
    } catch (error) {
        res.status(CONSTANTS.INTERNAL_SERVER_ERROR).json({
            statusCode: CONSTANTS.INTERNAL_SERVER_ERROR,
            message: error.message
        });
    }
});

// Admin-specific function to get dine-out request by ID
const getDineOutRequestByIdAdmin = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);
    if (!dineOutRequest) { return res.status(CONSTANTS.NOT_FOUND).json({ statusCode: CONSTANTS.NOT_FOUND, message: CONSTANTS.DINEOUT_NOT_FOUND }) }
    const responseData = {
        userInformation: {
            name: dineOutRequest.user.name,
            email: dineOutRequest.user.email,
            phone: dineOutRequest.user.phone,
        },
        dineOutDetails: {
            reservationTime: `${moment(dineOutRequest.date).format('YYYY-MM-DD')} ${dineOutRequest.time}`,
            guests: dineOutRequest.guests,
        },
        partnerInformation: {
            partnerName: dineOutRequest.partner.name,
            restaurantDetails: {
                name: dineOutRequest.business.businessName,
                address: dineOutRequest.business.businessAddress,
                openingDays: dineOutRequest.business.openingDays,
                openingTime: dineOutRequest.business.openingTime,
                closingTime: dineOutRequest.business.closingTime,
            },
        },
        partnerResponse: {
            status: dineOutRequest.status,
            responseTimestamp: dineOutRequest.updatedAt || 'Not available',
        },
    };

    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.DETAILS,
        data: responseData,
    });
});

module.exports = {
    checkTimeSlot,
    createDineOutRequest,
    getDineOutRequestById,
    getDineOutRequestsForBusiness,
    updateDineOutRequestStatus,
    getAllDineOutRequests,
    getDineOutRequestByIdAdmin
};