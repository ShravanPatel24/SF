const { BusinessTypeModel } = require('../models');
const CONSTANT = require('../config/constant');

/**
 * Create a Record
 * @param {Object} requestBody
 * @returns {Promise<Record>}
 */
const create = async (requestBody) => {
    if (requestBody.name && await BusinessTypeModel.isFieldValueTaken('name', requestBody.name)) {
        return { data: {}, code: CONSTANT.BAD_REQUEST, message: `Business Type ${requestBody.name} already exists.` };
    }

    const data = await BusinessTypeModel.create(requestBody);
    return { data: data, code: 200, message: CONSTANT.CREATED };
};

/**
 * Query for Record
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.searchBy] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queries = async (options) => {
    var condition = { $and: [{ isDelete: 1 }] };
    if (options.searchBy && options.searchBy != 'undefined') {
        var searchBy = {
            $regex: ".*" + options.searchBy + ".*",
            $options: "si"
        }
        condition.$and.push({
            $or: [{
                name: searchBy
            }]
        })
    }
    if (options.status && options.status != 'undefined') {
        condition.$and.push({
            $or: [{
                status: options.status
            }]
        })
    }

    // Date filtering based on filterDateRange
    if (options.filterDateRange) {
        const currentDate = new Date();
        const filterRange = options.filterDateRange.toLowerCase();
        // Handle past 3 and 6 months
        if (filterRange === 'past_3_months') {
            const pastThreeMonths = new Date();
            pastThreeMonths.setMonth(currentDate.getMonth() - 3);  // Subtracting 3 months
            pastThreeMonths.setHours(0, 0, 0, 0); // Reset time to start of the day
            condition.$and.push({
                createdAt: { $gte: pastThreeMonths, $lte: currentDate }
            });
        } else if (filterRange === 'past_6_months') {
            const pastSixMonths = new Date();
            pastSixMonths.setMonth(currentDate.getMonth() - 6);  // Subtracting 6 months
            pastSixMonths.setHours(0, 0, 0, 0); // Reset time to start of the day
            condition.$and.push({
                createdAt: { $gte: pastSixMonths, $lte: currentDate }
            });
        }

        // Handle filtering by specific years (2023 and 2022)
        else if (filterRange === '2023') {
            const startOf2023 = new Date('2023-01-01T00:00:00.000Z');
            const endOf2023 = new Date('2023-12-31T23:59:59.999Z');
            condition.$and.push({
                createdAt: { $gte: startOf2023, $lte: endOf2023 }
            });
        } else if (filterRange === '2022') {
            const startOf2022 = new Date('2022-01-01T00:00:00.000Z');
            const endOf2022 = new Date('2022-12-31T23:59:59.999Z');
            condition.$and.push({
                createdAt: { $gte: startOf2022, $lte: endOf2022 }
            });
        }

        // Handle custom date range
        if (filterRange.includes('-')) {
            const [startDateStr, endDateStr] = filterRange.match(/\d{4}-\d{2}-\d{2}/g);
            // Convert strings to Date objects
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            // Check for invalid dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date format in filterDateRange');
            }
            // Set startDate to 00:00:00 and endDate to 23:59:59
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            condition.$and.push({
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            });
        }
    }
    options['sort'] = { createdAt: -1 }
    const data = await BusinessTypeModel.paginate(condition, options);
    return data;
};

/**
 * Get Record by id
 * @param {ObjectId} id
 * @returns {Promise<Record>}
 */
const getById = async (id) => {
    var data = await BusinessTypeModel.findById(id)
    return data;
};

/**
 * Update industry by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<industry>}
 */
const updateById = async (id, updateBody) => {
    const data = await getById(id);
    if (updateBody.name && await BusinessTypeModel.isFieldValueTaken('name', updateBody.name, id)) {
        return { data: {}, code: CONSTANT.BAD_REQUEST, message: `Business Type ${updateBody.name} already exists.` };
    }
    Object.assign(data, updateBody);
    await data.save();
    return { data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.UPDATED };
};

/**
 * Delete industry by id
 * @param {ObjectId} id
 * @returns {Promise<industry>}
 */
const deleteById = async (id) => {
    const data = await getById(id);
    if (!data) {
        return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOT_FOUND_MSG }
    }
    data.isDelete = 0;
    await data.save();
    return { data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED }
};

const getListWithoutPagination = async (options) => {
    var condition = { $and: [{ isDelete: 1 }] };
    if (options.searchBy && options.searchBy != 'undefined') {
        var searchBy = {
            $regex: ".*" + options.searchBy + ".*",
            $options: "si"
        }

        condition.$and.push({
            $or: [{
                name: searchBy
            }]
        })
    }
    if (options.status && options.status != 'undefined') {
        condition.$and.push({
            $or: [{
                status: options.status
            }]
        })
    }
    let query = BusinessTypeModel.find(condition);

    if (options.limit) {
        query = query.limit(options.limit);
    }

    const Industry = await query.exec();
    return Industry;
};

module.exports = {
    create,
    queries,
    getById,
    updateById,
    deleteById,
    getListWithoutPagination
};
