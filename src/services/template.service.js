const { TemplateModel } = require('../models');
const CONSTANTS = require('../config/constant');
/**
 * Create a ENote
 * @param {Object} requestBody
 * @returns {Promise<Client>}
 */
const createTemplate = async (requestBody) => {
    const data = await TemplateModel.create(requestBody);
    return { data, statusCode: 201, message: CONSTANTS.TEMPLATE_CREATE };
};

/**
 * Query for ENotes
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.search] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryTemplate = async (options) => {
    const condition = { $and: [{ isDelete: 1 }] };

    // Search by templateName or subject fields if search is provided
    if (options.search && options.search !== 'undefined') {
        condition.$and.push({
            $or: [
                { templateName: { $regex: `.*${options.search}.*`, $options: 'i' } },
                { subject: { $regex: `.*${options.search}.*`, $options: 'i' } }
            ]
        });
    }

    // Filter by templateType if provided
    if (options.templateType && options.templateType !== 'undefined') {
        condition.$and.push({ templateType: options.templateType });
    }

    // Filter by status if provided (0 for inactive, 1 for active)
    if (options.status !== null && typeof options.status !== 'undefined') {
        condition.$and.push({ status: options.status });
    }

    options.sort = { createdAt: -1 };

    // Perform the query with pagination
    const data = await TemplateModel.paginate(condition, options);
    return data;
};

/**
 * Get ENote by id
 * @param {ObjectId} id
 * @returns {Promise<Client>}
 */
const getTemplateById = async (id) => {
    const data = await TemplateModel.findById(id);
    if (!data) {
        return { data: {}, statusCode: 404, message: CONSTANTS.TEMPLATE_NOT_FOUND };
    }
    return { data, statusCode: 200 };
};

/**
 * Update ENote by id
 * @param {ObjectId} eNoteId
 * @param {Object} updateBody
 * @returns {Promise<TEMPLATE>}
 */
const updateTemplateById = async (templateId, updateBody) => {
    const template = await TemplateModel.findById(templateId);
    if (!template) {
        return { data: {}, statusCode: 404, message: CONSTANTS.TEMPLATE_NOT_FOUND };
    }
    Object.assign(template, updateBody);
    await template.save();
    return { data: template, statusCode: 200, message: CONSTANTS.TEMPLATE_UPDATE };
};

/**
 * Delete ENote by id
 * @param {ObjectId} eNoteId
 * @returns {Promise<TEMPLATE>}
 */
const deleteTemplateById = async (templateId) => {
    const template = await TemplateModel.findById(templateId);
    if (!template) {
        return { data: {}, statusCode: 404, message: CONSTANTS.TEMPLATE_NOT_FOUND };
    }
    template.isDelete = 0;
    await template.save();
    return { data: {}, statusCode: 200, message: CONSTANTS.TEMPLATE_STATUS_DELETE };
};

/**
 * Query for ENote
 * @param {Object} options - Query options
 * @param {string} [options.search] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryTemplateWithoutPagination = async (options) => {
    const condition = { $and: [{ isDelete: 1 }] };

    if (options.search && options.search !== 'undefined') {
        condition.$and.push({
            $or: [{ title: { $regex: `.*${options.search}.*`, $options: 'si' } }]
        });
    }

    const data = await TemplateModel.find(condition);
    return { data, statusCode: 200 };
};

module.exports = {
    createTemplate,
    queryTemplate,
    getTemplateById,
    updateTemplateById,
    deleteTemplateById,
    queryTemplateWithoutPagination
};