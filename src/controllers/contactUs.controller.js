const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { ContactUsService } = require('../services');
const CONSTANT = require('../config/constant');

const createContact = catchAsync(async (req, res) => {
    const data = await ContactUsService.createContact(req.body);
    res.status(CONSTANT.SUCCESSFUL).json({
        statusCode: CONSTANT.SUCCESSFUL,
        message: CONSTANT.CONTACT_CREATED,
        data
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
    res.status(CONSTANT.SUCCESSFUL).json({
        statusCode: CONSTANT.SUCCESSFUL,
        message: CONSTANT.CONTACT_LIST,
        data: result
    });
});

const getContact = catchAsync(async (req, res) => {
    const data = await ContactUsService.getContactById(req.params.contactId, 'id');
    if (!data) {
        return res.status(CONSTANT.NOT_FOUND).json({
            statusCode: CONSTANT.NOT_FOUND,
            message: CONSTANT.CONTACT_NOT_FOUND,
            data: {}
        });
    }
    res.status(CONSTANT.SUCCESSFUL).json({
        statusCode: CONSTANT.SUCCESSFUL,
        message: CONSTANT.CONTACT_DETAILS,
        data
    });
});

const updateContact = catchAsync(async (req, res) => {
    const data = await ContactUsService.updateContactById(req.params.contactId, req.body);
    if (data.code !== CONSTANT.SUCCESSFUL) {
        return res.status(data.code).json({ statusCode: data.code, message: data.message, data: data.data });
    }
    res.status(CONSTANT.SUCCESSFUL).json({ statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CONTACT_UPDATE, data: data.data });
});

const deleteContact = catchAsync(async (req, res) => {
    const details = await ContactUsService.deleteContactById(req.params.contactId, req.user);
    if (details.code !== CONSTANT.SUCCESSFUL) {
        return res.status(details.code).json({ statusCode: details.code, message: details.message, data: details.data });
    }
    res.status(CONSTANT.SUCCESSFUL).json({
        statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CONTACT_DELETE, data: details.data
    });
});

module.exports = {
    createContact,
    getContacts,
    getContact,
    updateContact,
    deleteContact
};