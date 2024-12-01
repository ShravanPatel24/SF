const { ContactUsModel, UserModel } = require('../models');
const CONSTANT = require('../config/constant');

/**
 * Create a Contact
 * @param {Object} requestBody
 * @returns {Promise<Contact>}
 */
const createContact = async (requestBody) => {
    const data = await ContactUsModel.create(requestBody);
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
    let condition = { $and: [{ isDelete: 1 }] };

    // Handle the search condition
    if (options.search && options.search !== 'undefined') {
        condition.$and.push({
            $or: [
                {
                    name: {
                        $regex: '.*' + options.search + '.*',
                        $options: 'i', // Case-insensitive search
                    },
                },
                {
                    email: {
                        $regex: '.*' + options.search + '.*',
                        $options: 'i', // Case-insensitive search
                    },
                },
            ],
        });
    }

    if (options.status && options.status !== 'undefined') {
        condition.$and.push({ status: parseInt(options.status, 10) });
    }

    if (options.userType && options.userType !== 'undefined') {
        const users = await UserModel.find({ type: options.userType }, '_id').lean();
        const userIds = users.map((user) => user._id);
        condition.$and.push({ user: { $in: userIds } });
    }

    // Default sorting
    options.sort = { createdAt: -1 };

    // Perform the query with pagination
    const data = await ContactUsModel.paginate(condition, {
        ...options,
        populate: { path: 'user', select: 'type name email' }, // Populate user details
    });

    return data;
};

/**
 * Get Contact by id
 * @param {ObjectId} id
 * @returns {Promise<Contact>}
 */
const getContactById = async (id) => {
    return await ContactUsModel.findById(id);
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

    contact.replies.push(reply);
    await contact.save();

    return contact;
};

const getChatList = async () => {
    return await ContactUsModel.find({ isDelete: 1 })
        .select('name message createdAt')
        .sort({ createdAt: -1 }); // Sort by latest first
};

module.exports = {
    createContact,
    queryContact,
    getContactById,
    updateContactById,
    deleteContactById,
    addReply,
    getChatList
};
