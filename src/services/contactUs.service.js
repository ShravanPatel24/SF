const { ContactUsModel, UserModel } = require('../models');
const CONSTANT = require('../config/constant');

/**
 * Create a Contact
 * @param {Object} requestBody
 * @returns {Promise<Contact>}
 */
const createContact = async (requestBody) => {
    const data = await ContactUsModel.create({
        ...requestBody,
        status: "pending",
    });
    return { data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CONTACT_CREATE };
};

/**
 * Query for Contacts
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.search] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryContact = async (options) => {
    const condition = { $and: [{ isDelete: 1 }] };

    // Filter by search term (name or email)
    if (options.search && options.search !== "undefined") {
        condition.$and.push({
            $or: [
                { name: { $regex: `.*${options.search}.*`, $options: "i" } }, // Case-insensitive search
                { email: { $regex: `.*${options.search}.*`, $options: "i" } },
            ],
        });
    }

    // Filter by status
    if (options.status && options.status !== "undefined") {
        condition.$and.push({ status: options.status });
    }

    // Filter by user type
    if (options.userType && options.userType !== "undefined") {
        const users = await UserModel.find({ type: options.userType }, "_id").lean();
        if (users.length > 0) {
            const userIds = users.map((user) => user._id);
            condition.$and.push({ user: { $in: userIds } });
        } else {
            // If no users found, return an empty response directly
            return {
                docs: [],
                totalDocs: 0,
                limit: options.limit || 10,
                totalPages: 0,
                page: options.page || 1,
                pagingCounter: 0,
                hasPrevPage: false,
                hasNextPage: false,
                prevPage: null,
                nextPage: null,
            };
        }
    }

    // Filter by date range
    if (options.startDate || options.endDate) {
        const dateFilter = {};
        if (options.startDate) {
            dateFilter.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
            dateFilter.$lte = new Date(options.endDate);
        }
        condition.$and.push({ createdAt: dateFilter });
    }

    // Remove $and if no conditions are applied
    if (condition.$and.length === 0) {
        delete condition.$and;
    }

    // Sorting logic
    const sortOptions = {};
    if (options.sortBy) {
        options.sortBy.split(",").forEach((field) => {
            const [key, order] = field.split(":");
            sortOptions[key] = order === "desc" ? -1 : 1;
        });
    } else {
        sortOptions["createdAt"] = -1; // Default to latest first
    }

    // Perform the query with pagination
    const data = await ContactUsModel.paginate(condition, {
        page: options.page || 1,
        limit: options.limit || 10,
        sort: sortOptions,
        populate: { path: "user", select: "type name email" }, // Populate user details
    });

    return data;
};

/**
 * Get Contact by id
 * @param {ObjectId} id
 * @returns {Promise<Contact>}
 */
const getContactById = async (id, populateField = null) => {
    const query = ContactUsModel.findById(id);
    if (populateField) {
        query.populate(populateField); // Populate the user field to access the user type
    }
    return await query.exec();
};

/**
 * Update Contact by id
 * @param {ObjectId} contactId
 * @param {Object} updateBody
 * @returns {Promise<Contact>}
 */
const updateContactById = async (contactId, updateBody) => {
    const data = await getContactById(contactId);
    if (!data) {
        return { data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.CONTACT_NOT_FOUND };
    }
    Object.assign(data, updateBody);
    await data.save();
    return { data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CONTACT_UPDATE };
};

/**
 * Delete Contact by id
 * @param {ObjectId} contactId
 * @returns {Promise<Contact>}
 */
const deleteContactById = async (contactId) => {
    const data = await getContactById(contactId);
    if (!data) {
        return { data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.CONTACT_NOT_FOUND };
    }
    data.isDelete = 0;
    await data.save();
    return { data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CONTACT_DELETE };
};

// Admin related code
const addReply = async (contactId, reply) => {
    const contact = await ContactUsModel.findById(contactId);

    if (!contact) {
        return null;
    }

    // Add the admin's reply
    contact.replies.push(reply);

    // Update the status to "in_progress"
    contact.status = "in_progress";

    await contact.save();

    return contact;
};

const getChatList = async (options) => {
    let condition = { isDelete: 1 };

    // Filter by status if provided
    if (options.status) {
        condition.status = options.status;
    }

    // Handle search functionality
    if (options.search) {
        condition.$or = [
            { name: { $regex: options.search, $options: "i" } }, // Case-insensitive name search
            { email: { $regex: options.search, $options: "i" } }, // Case-insensitive email search
            { message: { $regex: options.search, $options: "i" } }, // Case-insensitive message search
        ];
    }

    // Default sorting by `createdAt` in descending order
    const sort = {};
    if (options.sortBy) {
        const parts = options.sortBy.split(":");
        sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
    } else {
        sort.createdAt = -1; // Default sort
    }

    // Pagination options
    const paginationOptions = {
        page: options.page || 1,
        limit: options.limit || 10,
        sort,
        select: "name message createdAt status", // Fields to include in the result
    };

    // Fetch paginated chat list
    const result = await ContactUsModel.paginate(condition, paginationOptions);
    return result;
};

const updateStatus = async (contactId, status) => {
    const contact = await ContactUsModel.findById(contactId);

    if (!contact) {
        return null;
    }

    contact.status = status;
    await contact.save();

    return contact;
};


// User/Partner Chat Code
const getConversationForUserOrPartner = async (contactId, userId) => {
    // Fetch the contact query and populate the user to determine the user type
    const contact = await ContactUsModel.findOne({ _id: contactId, user: userId, isDelete: 1 }).populate('user', 'type');

    if (!contact) {
        return null;
    }

    // Determine the sender of the initial message
    const initialSender = contact.user.type === "partner" ? "partner" : "user";

    // Prepare the messages array
    const messages = [
        {
            sender: initialSender, // Dynamically set the sender based on user type
            message: contact.message,
            createdAt: contact.createdAt,
        },
        ...contact.replies.map((reply) => ({
            sender: reply.sender, // Use the sender field from the reply
            message: reply.message,
            createdAt: reply.createdAt,
        })),
    ];

    return { contactId: contact._id, messages };
};

const addUserOrPartnerReply = async (contactId, userId, userType, message) => {
    const contact = await ContactUsModel.findOne({ _id: contactId, user: userId, isDelete: 1 });

    if (!contact) {
        return null;
    }

    const reply = {
        responder: userId,
        sender: userType === "partner" ? "partner" : "user",
        message,
        createdAt: new Date(),
    };

    contact.replies.push(reply);
    await contact.save();

    return reply;
};

module.exports = {
    createContact,
    queryContact,
    getContactById,
    updateContactById,
    deleteContactById,
    addReply,
    getChatList,
    updateStatus,
    getConversationForUserOrPartner,
    addUserOrPartnerReply
};