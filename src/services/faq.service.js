const { FAQModel } = require('../models');
const CONSTANT = require('../config/constant');

/**
 * Create a FAQ
 * @param {Object} requestBody
 * @returns {Promise<FAQ>}
 */
const createFAQ = async (requestBody) => {
    if (await FAQModel.isQuestionTaken(requestBody.question, '')) {
        return { data: {}, statusCode: 400, message: CONSTANT.FAQ_QUESTION_ALREADY_EXISTS };
    } else {
        const data = await FAQModel.create(requestBody);
        return { data: data, statusCode: 200, message: CONSTANT.FAQ_CREATE };
    }
};

/**
 * Query for FAQs
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.searchBy] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryFAQ = async (options) => {
    var condition = { $and: [{ isDelete: 1 }] };

    if (options.searchBy && options.searchBy != 'undefined') {
        condition.$and.push({
            $or: [{
                question: {
                    $regex: '.*' + options.searchBy + '.*',
                    $options: 'si',
                }
            }]
        });
    }
    if (options.status && options.status != 'undefined') {
        condition.$and.push({
            $or: [{ status: options.status }]
        });
    }
    options['sort'] = { createdAt: -1 };

    const data = await FAQModel.paginate(condition, options);
    return data;
};

/**
 * Get FAQ by id
 * @param {ObjectId} id
 * @returns {Promise<FAQ>}
 */
const getFAQById = async (id) => {
    return await FAQModel.findById(id);
};

/**
 * Get FAQ by id
 * @param {ObjectId} id
 * @returns {Promise<FAQ>}
 */
const getFAQByIdWithPopulate = async (value, type) => {
    console.log("🚀 ~ file: faq.service.js:66 ~ getFAQByIdWithPopulate ~ value:", value)
    const conditions = {};
    if (type == 'id') {
        conditions['_id'] = value;
    } else if (type == 'slug') {
        conditions['slug'] = value;
    }
    return await FAQModel.findOne(conditions);
};

/**
 * Get FAQ by category
 * @param {ObjectId} category
 * @returns {Promise<FAQ>}
 */
const getFAQByCategory = async (id) => {
    return await FAQModel.find({ category: id, isDelete: 1 });
};

/**
 * Update FAQ by id
 * @param {ObjectId} faqId
 * @param {Object} updateBody
 * @returns {Promise<FAQ>}
 */
const updateFAQById = async (faqId, updateBody) => {
    const data = await getFAQById(faqId);
    if (!data) {
        return { data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.FAQ_NOT_FOUND };
    }

    if (updateBody.question && (await FAQModel.isQuestionTaken(updateBody.question, faqId))) {
        return { data: {}, statusCode: CONSTANT.BAD_REQUEST, message: CONSTANT.FAQ_QUESTION_ALREADY_EXISTS };
    }

    // Handle soft delete
    if (updateBody.isDelete === 0) {
        data.isDelete = 0; // Mark as deleted
        await data.save();
        return { data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.FAQ_DELETED };
    }

    // Update fields
    Object.assign(data, updateBody);

    // Check for activation/deactivation
    let message = CONSTANT.FAQ_UPDATED;
    if (updateBody.status !== undefined) {
        message = updateBody.status === 1
            ? CONSTANT.FAQ_ACTIVATED
            : CONSTANT.FAQ_INACTIVATED;
    }

    await data.save();
    return { data: data, statusCode: CONSTANT.SUCCESSFUL, message };
};

/**
 * Delete FAQ by id
 * @param {ObjectId} faqId
 * @returns {Promise<FAQ>}
 */
const deleteFAQById = async (faqId) => {
    const data = await getFAQById(faqId);
    if (!data) {
        return { data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.FAQ_NOT_FOUND };
    }

    data.isDelete = 0;
    await data.save();

    return { data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.FAQ_DELETED };
};

/**
 * Query for FAQ
 * @param {Object} options - Query options
 * @param {string} [options.searchBy] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryFAQWithoutPagination = async (options) => {
    var condition = { $and: [{ isDelete: 1 }] };
    let sorting = {}
    // var condition = {};
    if (options.searchBy && options.searchBy != 'undefined') {
        condition['question'] = {
            $regex: '.*' + options.searchBy + '.*',
            $options: 'si',
        };
    }


    if (options.status && options.status != 'undefined') {
        condition['status'] = options.status;
    }

    if (options.for && options.for != 'undefined') {
        condition['for'] = options.for;
    }

    sorting = { createdAt: -1 };

    const data = await FAQModel.find(condition).sort(sorting);
    return data;
};

module.exports = {
    createFAQ,
    queryFAQ,
    getFAQById,
    getFAQByCategory,
    updateFAQById,
    deleteFAQById,
    getFAQByIdWithPopulate,
    queryFAQWithoutPagination
};
