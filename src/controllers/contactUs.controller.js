const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { ContactUsService } = require('../services');
const CONSTANTS = require('../config/constant');

const createContact = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const requestBody = { ...req.body, user: userId };
    const { data, statusCode, message } = await ContactUsService.createContact(requestBody);
    res.status(statusCode).json({
        statusCode,
        message,
        data,
    });
});

const getContacts = catchAsync(async (req, res) => {
    const options = pick(req.query, [
        'sortBy',
        'limit',
        'page',
        'searchBy',
        'contactId',
        'status'
    ]);
    const result = await ContactUsService.queryContact(options);
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.CONTACT_LIST,
        data: result
    });
});

const getContact = catchAsync(async (req, res) => {
    const data = await ContactUsService.getContactById(req.params.contactId, 'id');
    if (!data) {
        return res.status(CONSTANTS.NOT_FOUND).json({
            statusCode: CONSTANTS.NOT_FOUND,
            message: CONSTANTS.CONTACT_NOT_FOUND,
            data: {}
        });
    }
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.CONTACT_DETAILS,
        data
    });
});

const updateContact = catchAsync(async (req, res) => {
    const data = await ContactUsService.updateContactById(req.params.contactId, req.body);
    if (data.code !== CONSTANTS.SUCCESSFUL) {
        return res.status(data.code).json({ statusCode: data.code, message: data.message, data: data.data });
    }
    res.status(CONSTANTS.SUCCESSFUL).json({ statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.CONTACT_UPDATE, data: data.data });
});

const deleteContact = catchAsync(async (req, res) => {
    const details = await ContactUsService.deleteContactById(req.params.contactId, req.user);
    if (details.code !== CONSTANTS.SUCCESSFUL) {
        return res.status(details.code).json({ statusCode: details.code, message: details.message, data: details.data });
    }
    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL, message: CONSTANTS.CONTACT_DELETE, data: details.data
    });
});

// Admin Functions
const getContactSummaries = catchAsync(async (req, res) => {
    const options = pick(req.query, ["sortBy", "limit", "page", "search", "status", "userType"]);
    const result = await ContactUsService.queryContact(options);

    res.status(200).json({
        statusCode: 200,
        message: "Contact summaries fetched successfully.",
        data: {
            docs: result.docs.map((contact) => ({
                id: contact._id,
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                message: contact.message,
                status: contact.status,
                userType: contact.user?.type, // Include userType from populated user field
                createdAt: contact.createdAt,
            })),
            totalDocs: result.totalDocs,
            limit: result.limit,
            totalPages: result.totalPages,
            page: result.page,
            pagingCounter: result.pagingCounter,
            hasPrevPage: result.hasPrevPage,
            hasNextPage: result.hasNextPage,
            prevPage: result.prevPage,
            nextPage: result.nextPage,
        },
    });
});

const getContactDetails = catchAsync(async (req, res) => {
    const contactId = req.params.id;
    const contact = await ContactUsService.getContactById(contactId);

    if (!contact) {
        return res.status(404).json({
            statusCode: 404,
            message: 'Contact not found',
        });
    }

    res.status(200).json({
        statusCode: 200,
        message: 'Contact details fetched successfully.',
        data: {
            id: contact._id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            status: contact.status,
            message: contact.message,
            problemType: contact.problemType,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        },
    });
});

module.exports = {
    createContact,
    getContacts,
    getContact,
    updateContact,
    deleteContact,
    getContactSummaries,
    getContactDetails
};