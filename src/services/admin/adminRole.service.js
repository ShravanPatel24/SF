const { AdminRoles } = require('../../models');
const CONSTANTS = require('../../config/constant');
/**
 * Create a role
 * @param {Object} roleBody
 * @returns {Promise<Roles>}
 */
const createRole = async (roleBody) => {
    try {
        const role = await AdminRoles.create(roleBody);
        return role;
    } catch (error) {
        if (error.code === 11000) {
            // Handle duplicate key error
            throw new Error(`Role "${roleBody.name}" already exists.`);
        }
        console.error("Error while creating role:", error);
        throw new Error("Failed to create role.");
    }
};

/**
 * Query for roles
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {string} [options.searchBy] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryRoles = async (options) => {
    try {
        const condition = { $and: [{ company: options.companyId, isDelete: 1 }] };
        if (options.searchBy) {
            condition.$and.push({
                $or: [{ name: { $regex: `.*${options.searchBy}.*`, $options: 'si' } }]
            });
        }
        options.sort = { createdAt: -1 };
        const roles = await AdminRoles.paginate(condition, options);
        return roles;
    } catch (error) {
        console.error("Error while querying roles:", error);
        throw new Error(CONSTANTS.FAILED_QUERY_ROLES);
    }
};

/**
 * Get role by id
 * @param {ObjectId} id
 * @returns {Promise<Roles>}
 */
const getRoleById = async (id) => {
    try {
        const role = await AdminRoles.findById(id);
        if (!role) {
            const error = new Error(CONSTANTS.ROLE_NOT_FOUND);
            error.statusCode = 404;
            throw error;
        }
        return role;
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
            error.message = "Failed to fetch role";
        }
        throw error;
    }
};

/**
 * Update role by id
 * @param {ObjectId} roleId
 * @param {Object} updateBody
 * @returns {Promise<Roles>}
 */
const updateRoleById = async (roleId, updateBody) => {
    const role = await AdminRoles.findById(roleId);
    if (!role) {
        const error = new Error(CONSTANTS.ROLE_NOT_FOUND);
        error.statusCode = 404;
        throw error;
    }
    Object.assign(role, updateBody);
    await role.save();
    return role;
};

/**
 * Delete role by id
 * @param {ObjectId} roleId
 * @returns {Promise<Roles>}
 */
const deleteRoleById = async (roleId) => {
    const role = await AdminRoles.findById(roleId);
    if (!role) {
        const error = new Error(CONSTANTS.ROLE_NOT_FOUND);
        error.statusCode = 404;
        throw error;
    }
    role.isDelete = 0;
    await role.save();
    return role;
};

/**
 * Query for roles
 * @param {Object} options - Query options
 * @param {string} [options.searchBy] - Search By use for search
 * @returns {Promise<QueryResult>}
 */
const queryRolesWithoutPagination = async (options) => {
    try {
        const condition = {
            $and: [
                { company: options.companyId, isDelete: 1 },
                ...(options.status !== undefined ? [{ status: options.status }] : []),
            ],
        };
        if (options.searchBy) {
            condition.$and.push({
                $or: [{ name: { $regex: `.*${options.searchBy}.*`, $options: 'si' } }],
            });
        }
        const roles = await AdminRoles.find(condition);
        return roles;
    } catch (error) {
        console.error("Error fetching roles:", error);
        throw new Error(CONSTANTS.FAILED_QUERY_ROLES);
    }
};

module.exports = {
    createRole,
    queryRoles,
    getRoleById,
    updateRoleById,
    deleteRoleById,
    queryRolesWithoutPagination
};