const { AdminStaffModel } = require('../../models');
const mongoose = require('mongoose');

const getAdminStaffByEmail = async (email) => {
    return AdminStaffModel.findOne({ email }).populate('role');
};

const getAdminStaffByPhone = async (phone) => {
    return AdminStaffModel.findOne({ phone }).populate('role');
};

const createAdminStaffUser = async (staffData) => {
    try {
        const staff = await AdminStaffModel.create(staffData);
        return staff;
    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern && error.keyPattern.email) {
                throw new Error('Email is already in use.');
            }
            if (error.keyPattern && error.keyPattern.phone) {
                throw new Error('Phone number is already in use.');
            }
        }
        if (error.name === 'ValidationError') {
            throw new Error('Validation error: ' + error.message);
        }
        throw new Error('Failed to create admin staff user.');
    }
};

const queryAdminStaffUsers = async (options) => {
    const { limit = 10, page = 1, search, status } = options;
    const matchQuery = {};
    if (search && search.trim() !== '') {
        matchQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { 'role.name': { $regex: search, $options: 'i' } }
        ];
    }
    if (status !== undefined && status !== '') {
        matchQuery.status = parseInt(status, 10);
    }
    const currentPage = page > 0 ? parseInt(page, 10) : 1;

    const aggregateQuery = mongoose.model('AdminStaff').aggregate([
        {
            $lookup: {
                from: 'adminroles',
                localField: 'role',
                foreignField: '_id',
                as: 'role'
            }
        },
        { $unwind: '$role' },
        { $match: matchQuery },
    ]);

    const result = await mongoose.model('AdminStaff').aggregatePaginate(aggregateQuery, {
        page: currentPage,
        limit: parseInt(limit, 10),
    });

    return result;
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
    getAdminStaffByEmail,
    getAdminStaffByPhone,
    createAdminStaffUser,
    queryAdminStaffUsers,
    getAdminStaffUserById,
    updateAdminStaffUserById,
    deleteAdminStaffUserById,
    queryUsersWithoutPagination,
    getStaffWithRole
};