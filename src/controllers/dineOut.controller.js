const { DineOutRequestService } = require('../services');
const CONSTANTS = require('../config/constant');
const catchAsync = require('../utils/catchAsync');
const { UserModel, BusinessModel } = require('../models');
const moment = require('moment');

// Check Time Slot Availability
const checkTimeSlot = catchAsync(async (req, res) => {
    const { businessId, dateTime } = req.body;

    try {
        // Check time slot availability
        await DineOutRequestService.checkTimeSlotAvailability(businessId, dateTime);

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: 'Time slot is available',
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: error.message,
        });
    }
});

// Create a dine-out request
const createDineOutRequest = catchAsync(async (req, res) => {
    const { partnerId, businessId, dateTime, guests, dinnerType } = req.body;
    const userId = req.user._id;

    try {
        if (req.user.type === 'partner') {
            return res.status(CONSTANTS.UNAUTHORIZED).json({
                statusCode: CONSTANTS.UNAUTHORIZED,
                message: CONSTANTS.PERMISSION_DENIED,
            });
        }

        // Validate partner and business
        const partner = await UserModel.findById(partnerId).where({ type: 'partner' });
        if (!partner) {
            return res.status(CONSTANTS.NOT_FOUND).json({
                statusCode: CONSTANTS.NOT_FOUND,
                message: CONSTANTS.PARTNER_NOT_FOUND_MSG,
            });
        }

        const business = await BusinessModel.findById(businessId);
        if (!business || business.partner.toString() !== partnerId) {
            return res.status(CONSTANTS.BAD_REQUEST).json({
                statusCode: CONSTANTS.BAD_REQUEST,
                message: CONSTANTS.BUSINESS_NOT_ASSOCOATED_WITH_PARTNER,
            });
        }

        if (!business.dineInStatus) {
            return res.status(CONSTANTS.BAD_REQUEST).json({
                statusCode: CONSTANTS.BAD_REQUEST,
                message: CONSTANTS.DINEOUT_DISABLED,
            });
        }

        // Check time slot availability
        await DineOutRequestService.checkTimeSlotAvailability(businessId, dateTime);

        // Save dine-out request with `dateTime` in UTC as received
        const newRequest = await DineOutRequestService.createDineOutRequest({
            user: userId,
            partner: partnerId,
            business: businessId,
            dateTime, // Save the full UTC dateTime as received
            guests,
            dinnerType,
        });

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.CREATED,
            request: newRequest,
            requestNumber: newRequest.requestNumber,
        });
    } catch (error) {
        res.status(CONSTANTS.BAD_REQUEST).json({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: error.message,
        });
    }
});

// Get a specific dine-out request by ID
const getDineOutRequestById = catchAsync(async (req, res) => {
    const { requestId } = req.params;

    if (req.user.type !== 'partner') {
        return res.status(CONSTANTS.UNAUTHORIZED).json({
            statusCode: CONSTANTS.UNAUTHORIZED,
            message: CONSTANTS.PERMISSION_DENIED,
        });
    }

    const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);

    if (!dineOutRequest) {
        return res.status(CONSTANTS.NOT_FOUND).json({
            statusCode: CONSTANTS.NOT_FOUND,
            message: CONSTANTS.DINEOUT_NOT_FOUND,
        });
    }
    const reservationTime = dineOutRequest.dateTime;

    const responseData = {
        requestNumber: dineOutRequest.requestNumber,
        status: dineOutRequest.status,
        reservationTime,
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
        return res.status(CONSTANTS.UNAUTHORIZED).json({
            statusCode: CONSTANTS.UNAUTHORIZED,
            message: CONSTANTS.PERMISSION_DENIED,
        });
    }

    const requests = await DineOutRequestService.getDineOutRequestsForBusiness(businessId);

    if (!requests || requests.length === 0) {
        return res.status(CONSTANTS.NOT_FOUND).json({
            statusCode: CONSTANTS.NOT_FOUND,
            message: CONSTANTS.NOT_FOUND_MSG,
        });
    }

    // Add reservationTime to each request
    const responseData = requests.map((request) => ({
        requestNumber: request.requestNumber,
        status: request.status,
        reservationTime: request.dateTime,
        user: {
            name: request.user.name,
            email: request.user.email,
        },
        partner: {
            name: request.partner.name,
        },
        business: {
            businessName: request.business.businessName,
            businessAddress: request.business.businessAddress,
        },
    }));

    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        requests: responseData,
    });
});

// Get dine-out requests details 
const getDineOutDetailsForUser = catchAsync(async (req, res) => {
    const { requestId } = req.params;

    try {
        const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);

        if (!dineOutRequest) {
            return res.status(CONSTANTS.NOT_FOUND).json({
                statusCode: CONSTANTS.NOT_FOUND,
                message: CONSTANTS.DINEOUT_NOT_FOUND,
            });
        }

        // Check if the user is authorized to view this request
        if (dineOutRequest.user._id.toString() !== req.user._id.toString()) {
            return res.status(CONSTANTS.UNAUTHORIZED).json({
                statusCode: CONSTANTS.UNAUTHORIZED,
                message: CONSTANTS.PERMISSION_DENIED,
            });
        }

        // Use the `dateTime` field directly
        const reservationTime = dineOutRequest.dateTime;

        const responseData = {
            requestNumber: dineOutRequest.requestNumber,
            status: dineOutRequest.status,
            user: {
                name: dineOutRequest.user.name,
                email: dineOutRequest.user.email,
                phone: dineOutRequest.user.phone,
            },
            business: {
                businessName: dineOutRequest.business.businessName,
                businessAddress: dineOutRequest.business.businessAddress,
                openingDays: dineOutRequest.business.openingDays,
                openingTime: dineOutRequest.business.openingTime,
                closingTime: dineOutRequest.business.closingTime,
                images: dineOutRequest.business.images || [], // Include images from the business
            },
            dineOutDetails: {
                reservationTime, // Use the `dateTime` field directly
                guests: dineOutRequest.guests,
                dinnerType: dineOutRequest.dinnerType,
            },
            partner: {
                name: dineOutRequest.partner.name,
            },
        };

        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.DETAILS,
            data: responseData,
        });
    } catch (error) {
        res.status(CONSTANTS.INTERNAL_SERVER_ERROR).json({
            statusCode: CONSTANTS.INTERNAL_SERVER_ERROR,
            message: error.message,
        });
    }
});

// Confirm the dine-out booking by the partner
const updateDineOutRequestStatus = catchAsync(async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;

    try {
        const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);

        if (!dineOutRequest) {
            return res.status(CONSTANTS.NOT_FOUND).json({
                statusCode: CONSTANTS.NOT_FOUND,
                message: CONSTANTS.DINEOUT_NOT_FOUND,
            });
        }

        if (dineOutRequest.partner._id.toString() !== req.user._id.toString()) {
            return res.status(CONSTANTS.UNAUTHORIZED).json({
                statusCode: CONSTANTS.UNAUTHORIZED,
                message: CONSTANTS.PERMISSION_DENIED,
            });
        }

        let bookingId = null;
        if (status === 'Accepted') {
            bookingId = Math.floor(Date.now() / 1000).toString(); // Generate a booking ID
        }

        const updatedRequest = await DineOutRequestService.updateDineOutRequestStatus(requestId, status, bookingId);

        if (status === 'Accepted') {
            const business = await BusinessModel.findById(dineOutRequest.business);
            if (!business) {
                return res.status(CONSTANTS.NOT_FOUND).json({
                    statusCode: CONSTANTS.NOT_FOUND,
                    message: CONSTANTS.BUSINESS_NOT_FOUND,
                });
            }

            // Find the first available table
            const availableTable = business.tableManagement.find(
                table => table.status === 'available'
            );

            if (availableTable) {
                // Assign the table number to the dine-out request
                dineOutRequest.tableNumber = availableTable.tableNumber;

                // Save the updated dine-out request
                await dineOutRequest.save();  // Save the updated dine-out request with the assigned table number

                // Update the table status to "booked"
                availableTable.status = 'booked';
                await business.save();  // Save the updated table status

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
                    },
                    tableAssigned: availableTable.tableNumber, // Send back the assigned table number
                });
            } else {
                return res.status(CONSTANTS.BAD_REQUEST).json({
                    statusCode: CONSTANTS.BAD_REQUEST,
                    message: "No available tables to book.",
                });
            }
        }

        if (status === 'Rejected') {
            return res.status(CONSTANTS.SUCCESSFUL).json({
                statusCode: CONSTANTS.SUCCESSFUL,
                message: CONSTANTS.DINEOUT_REQUEST_REJECTED,
                request: updatedRequest,
            });
        }
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            statusCode: error.statusCode || 500,
            message: error.message || 'An internal server error has occurred.',
        });
    }
});

// Cancel a dine-out booking for the user
const cancelDineOutRequest = catchAsync(async (req, res) => {
    const { requestId } = req.params;

    try {
        const dineOutRequest = await DineOutRequestService.getDineOutRequestById(requestId);

        if (!dineOutRequest) {
            return res.status(CONSTANTS.NOT_FOUND).json({
                statusCode: CONSTANTS.NOT_FOUND,
                message: CONSTANTS.DINEOUT_NOT_FOUND,
            });
        }

        // Ensure that the user owns this booking
        if (dineOutRequest.user._id.toString() !== req.user._id.toString() && dineOutRequest.partner._id.toString() !== req.user._id.toString()) {
            return res.status(CONSTANTS.UNAUTHORIZED).json({
                statusCode: CONSTANTS.UNAUTHORIZED,
                message: CONSTANTS.PERMISSION_DENIED,
            });
        }

        // Check if the request can be canceled (must be in Pending or Accepted status)
        if (!['Pending', 'Accepted'].includes(dineOutRequest.status)) {
            return res.status(CONSTANTS.BAD_REQUEST).json({
                statusCode: CONSTANTS.BAD_REQUEST,
                message: `Cancellation is not allowed for the current status: ${dineOutRequest.status}. Only Pending or Accepted requests can be cancelled.`,
            });
        }

        // Update the dine-out request status to 'Cancelled'
        await DineOutRequestService.updateDineOutRequestStatus(requestId, 'Cancelled');

        // If a table was assigned, update its status to 'cancelled'
        if (dineOutRequest.tableNumber) {
            const business = await BusinessModel.findById(dineOutRequest.business);
            if (!business) {
                return res.status(CONSTANTS.NOT_FOUND).json({
                    statusCode: CONSTANTS.NOT_FOUND,
                    message: CONSTANTS.BUSINESS_NOT_FOUND,
                });
            }

            // Find the table assigned to this request
            const tableToUpdate = business.tableManagement.find(table => table.tableNumber === dineOutRequest.tableNumber);
            if (tableToUpdate) {
                // Update table status to 'cancelled'
                tableToUpdate.status = 'cancelled';  // Mark it as cancelled
                await business.save();  // Save the updated table status
            }
        }

        // Return success message
        res.status(CONSTANTS.SUCCESSFUL).json({
            statusCode: CONSTANTS.SUCCESSFUL,
            message: 'Dine-out request has been successfully cancelled.',
            requestId: dineOutRequest._id,
        });
    } catch (error) {
        console.error('Error during cancellation:', error.message);
        return res.status(CONSTANTS.INTERNAL_SERVER_ERROR).json({
            statusCode: CONSTANTS.INTERNAL_SERVER_ERROR,
            message: error.message,
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
    getDineOutDetailsForUser,
    updateDineOutRequestStatus,
    cancelDineOutRequest,
    getAllDineOutRequests,
    getDineOutRequestByIdAdmin
};