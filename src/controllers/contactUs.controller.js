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
        'search',
        'status',
        'userType'
    ]);

    const result = await ContactUsService.queryContact(options);

    res.status(CONSTANTS.SUCCESSFUL).json({
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.CONTACT_LIST,
        data: {
            docs: result.docs.map((contact) => ({
                id: contact._id,
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                message: contact.message,
                status: contact.status,
                userType: contact.user?.type,
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

const getContact = catchAsync(async (req, res) => {
    const contactId = req.params.contactId;

    // Fetch the contact document
    const data = await ContactUsService.getContactById(contactId);

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

    // Ensure default sort is by `createdAt` in descending order
    options.sortBy = options.sortBy || "-createdAt"; // Default to descending order

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
                userType: contact.user?.type,
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

// Admin related code
const replyToContact = catchAsync(async (req, res) => {
    const { contactId } = req.params;
    const adminId = req.user._id; // Admin ID from the auth middleware
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({
            statusCode: 400,
            message: "Reply message is required.",
        });
    }

    const reply = {
        responder: adminId,
        sender: "admin",
        message,
        createdAt: new Date(),
    };

    const contact = await ContactUsService.addReply(contactId, reply);

    if (!contact) {
        return res.status(404).json({
            statusCode: 404,
            message: "Contact query not found.",
        });
    }

    // Automatically update the status to "in_progress"
    contact.status = "in_progress";
    await contact.save();

    res.status(200).json({
        statusCode: 200,
        message: "Reply added successfully.",
        data: {
            contactId: contact._id,
            status: contact.status,
            reply,
        },
    });
});

const getChatList = catchAsync(async (req, res) => {
    const options = pick(req.query, ["status", "sortBy", "limit", "page", "search"]);
    const result = await ContactUsService.getChatList(options);

    res.status(200).json({
        statusCode: 200,
        message: "Chat list fetched successfully",
        data: {
            chats: result.docs,
            pagination: {
                totalDocs: result.totalDocs,
                limit: result.limit,
                totalPages: result.totalPages,
                page: result.page,
                hasPrevPage: result.hasPrevPage,
                hasNextPage: result.hasNextPage,
                prevPage: result.prevPage,
                nextPage: result.nextPage,
            },
        },
    });
});

const getConversation = catchAsync(async (req, res) => {
    const { contactId } = req.params;

    // Fetch the contact query and populate the user details to determine the user type
    const contact = await ContactUsService.getContactById(contactId, 'user');

    if (!contact) {
        return res.status(404).json({
            statusCode: 404,
            message: "Contact query not found",
        });
    }

    // Determine the sender of the initial message
    const initialSender = contact.user.type === "partner" ? "partner" : "user";

    // Prepare the response
    res.status(200).json({
        statusCode: 200,
        message: "Conversation fetched successfully.",
        data: {
            contactId: contact._id,
            messages: [
                {
                    sender: initialSender, // Dynamically determine the sender
                    message: contact.message,
                    createdAt: contact.createdAt,
                },
                ...contact.replies.map(reply => ({
                    sender: reply.sender, // Use the dynamically stored sender field
                    message: reply.message,
                    createdAt: reply.createdAt,
                })),
            ],
        },
    });
});

const updateQueryStatus = catchAsync(async (req, res) => {
    const { contactId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "in_progress", "resolved", "rejected", "closed"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            statusCode: 400,
            message: "Invalid status value.",
        });
    }

    const contact = await ContactUsService.updateStatus(contactId, status);

    if (!contact) {
        return res.status(404).json({
            statusCode: 404,
            message: "Contact query not found.",
        });
    }

    res.status(200).json({
        statusCode: 200,
        message: "Query status updated successfully.",
        data: { contactId: contact._id, status: contact.status },
    });
});

// User/Partner Chat Code
const getConversationForUserOrPartner = catchAsync(async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user._id; // Logged-in user's ID

    const conversation = await ContactUsService.getConversationForUserOrPartner(contactId, userId);

    if (!conversation) {
        return res.status(404).json({
            statusCode: 404,
            message: "Conversation not found or unauthorized access.",
        });
    }

    res.status(200).json({
        statusCode: 200,
        message: "Conversation fetched successfully.",
        data: conversation,
    });
});

const replyToAdmin = catchAsync(async (req, res) => {
    const { contactId } = req.params;
    const userId = req.user._id;
    const userType = req.user.type;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({
            statusCode: 400,
            message: "Reply message is required.",
        });
    }

    const reply = await ContactUsService.addUserOrPartnerReply(contactId, userId, userType, message);

    if (!reply) {
        return res.status(404).json({
            statusCode: 404,
            message: "Contact query not found or unauthorized access.",
        });
    }

    res.status(200).json({
        statusCode: 200,
        message: "Reply sent successfully.",
        data: reply,
    });
});

module.exports = {
    createContact,
    getContacts,
    getContact,
    updateContact,
    deleteContact,
    getContactSummaries,
    getContactDetails,
    replyToContact,
    getChatList,
    getConversation,
    updateQueryStatus,
    getConversationForUserOrPartner,
    replyToAdmin
};