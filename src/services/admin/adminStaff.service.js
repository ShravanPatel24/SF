const { AdminStaffModel } = require('../../models');

const createAdminStaffUser = async (staffData) => {
    return AdminStaffModel.create(staffData);
};

const queryAdminStaffUsers = async (options) => {
    const { limit = 10, page = 1, searchBy, status, loginedInUser } = options;
    const query = {};
    if (searchBy) { query.name = { $regex: searchBy, $options: 'i' } }
    if (status) { query.status = status }
    const paginateOptions = { page: parseInt(page), limit: parseInt(limit) };
    return AdminStaffModel.paginate(query, paginateOptions);
};

const getAdminStaffUserById = async (id) => {
    return AdminStaffModel.findById(id);
};

const updateAdminStaffUserById = async (id, updateData) => {
    return AdminStaffModel.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteAdminStaffUserById = async (id) => {
    return AdminStaffModel.findByIdAndDelete(id);
};

const queryUsersWithoutPagination = async (options) => {
    const query = {};
    if (options.searchBy) {
        query.name = { $regex: options.searchBy, $options: 'i' };
    }
    return AdminStaffModel.find(query);
};

const getStaffWithRole = async (staffId) => {
    const staff = await AdminStaffModel.findById(staffId).populate({ path: 'role', select: 'name status isDelete resource' });
    if (!staff) { throw new Error('Staff member not found') }
    return staff;
};

module.exports = {
    createAdminStaffUser,
    queryAdminStaffUsers,
    getAdminStaffUserById,
    updateAdminStaffUserById,
    deleteAdminStaffUserById,
    queryUsersWithoutPagination,
    getStaffWithRole
};