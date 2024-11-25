const { DineOutModel, BusinessModel } = require('../models');
const CONSTANTS = require('../config/constant');
const moment = require('moment');

// Check Time Slot Availability
const checkTimeSlotAvailability = async (businessId, dateTime) => {
    const business = await BusinessModel.findById(businessId);
    if (!business || !business.dineInStatus) {
        throw new Error('Business not found or dine-in is not available');
    }

    // Parse date and time from the incoming dateTime
    const requestedDate = moment.utc(dateTime).format('YYYY-MM-DD');

    // Find operating details for the requested date
    const operatingDetail = business.operatingDetails.find(detail => detail.date === requestedDate);
    if (!operatingDetail) {
        throw new Error('The business is not operating on the selected date.');
    }

    // Check if the requested time is within operating hours
    const isWithinOperatingHours = moment.utc(dateTime).isBetween(
        moment.utc(operatingDetail.startTime),
        moment.utc(operatingDetail.endTime),
        null,
        '[)'
    );
    if (!isWithinOperatingHours) {
        throw new Error('Selected time slot is not within operating hours.');
    }

    // Check for exact conflicting time slots
    const conflictingRequests = await DineOutModel.findOne({
        business: businessId,
        dateTime: dateTime, // Only check the specific time slot
        status: { $in: ['Pending', 'Accepted'] },
    });

    if (conflictingRequests) {
        throw new Error('The selected time slot is already booked.');
    }

    return true;
};

// Create a dine-out request
const createDineOutRequest = async (data) => {
    try {
        const requestNumber = Math.floor(Date.now() / 1000).toString(); // Generate a unique request number
        const newRequest = new DineOutModel({
            ...data,
            requestNumber,
        });

        await newRequest.save();
        return newRequest;
    } catch (error) {
        throw new Error('Error creating dine-out request: ' + error.message);
    }
};

// Get a specific dine-out request by ID
const getDineOutRequestById = async (requestId) => {
    const request = await DineOutModel.findById(requestId)
        .populate('user', 'name email phone')
        .populate('partner', 'name')
        .populate('business', 'businessName businessAddress openingDays openingTime closingTime images')
        .lean();

    if (!request) {
        throw { statusCode: 404, message: CONSTANTS.DINEOUT_NOT_FOUND };
    }

    return request;
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

// Get all dine-out requests with detailed user and partner information for admin
const getAllDineOutRequests = async ({ page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', status = '' }) => {
    try {
        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
        };

        const searchQuery = {};

        // Add a search condition if present
        if (search) {
            searchQuery.$or = [
                { 'user.name': { $regex: search, $options: 'i' } },
                { 'partner.name': { $regex: search, $options: 'i' } },
                { 'business.businessName': { $regex: search, $options: 'i' } },
                { requestNumber: { $regex: search, $options: 'i' } },
                { dinnerType: { $regex: search, $options: 'i' } },
            ];
        }

        // Add status filter if present
        if (status && ['Pending', 'Accepted', 'Rejected'].includes(status)) {
            searchQuery.status = status;
        }

        const requests = await DineOutModel.find(searchQuery)
            .populate('user', 'name _id')
            .populate({
                path: 'partner',
                select: 'name businessId',
                populate: {
                    path: 'businessId',
                    select: 'businessName dineInStatus'
                }
            })
            .populate('business', 'businessName dineInStatus')
            .sort(options.sort)
            .skip((options.page - 1) * options.limit)
            .limit(options.limit)
            .lean();

        const totalDocs = await DineOutModel.countDocuments(searchQuery);
        const formattedRequests = requests.map(request => ({
            requestId: request._id,
            user: request.user ? request.user : { _id: null, name: 'Unknown User' },
            partner: {
                _id: request.partner ? request.partner._id : null,
                name: request.partner ? request.partner.name : 'Unknown Partner',
                businessId: request.partner && request.partner.businessId ? request.partner.businessId : null,
            },
            business: {
                _id: request.business ? request.business._id : null,
                businessName: request.business ? request.business.businessName : 'Unknown Business',
                dineInStatus: request.business ? request.business.dineInStatus : null,
            },
            date: request.date,
            time: request.time,
            guests: request.guests,
            dinnerType: request.dinnerType,
            status: request.status,
            bookingId: request.bookingId,
            requestNumber: request.requestNumber,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
        }));

        return {
            docs: formattedRequests,
            totalDocs,
            limit: options.limit,
            totalPages: Math.ceil(totalDocs / options.limit),
            page: options.page,
            pagingCounter: ((options.page - 1) * options.limit) + 1,
            hasPrevPage: options.page > 1,
            hasNextPage: options.page < Math.ceil(totalDocs / options.limit),
            prevPage: options.page > 1 ? options.page - 1 : null,
            nextPage: options.page < Math.ceil(totalDocs / options.limit) ? options.page + 1 : null,
        };
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
    getAllDineOutRequests
};