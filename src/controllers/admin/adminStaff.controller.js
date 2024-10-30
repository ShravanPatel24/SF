const pick = require('../../utils/pick');
const catchAsync = require('../../utils/catchAsync');
const { adminStaffService, adminAuthService, s3Service } = require('../../services');
const CONSTANTS = require('../../config/constant');
const { AdminStaffModel } = require('../../models');
const bcrypt = require('bcryptjs');

const createAdminStaffUser = catchAsync(async (req, res) => {
    try {
        if (req.user.type !== 'superadmin') {
            return res.status(403).send({
                statusCode: 403,
                message: 'Only a superadmin can create staff members.'
            });
        }
        const staff = await adminStaffService.createAdminStaffUser(req.body);
        return res.status(200).send({
            data: staff,
            statusCode: CONSTANTS.SUCCESSFUL,
            message: CONSTANTS.ADMIN_STAFF_CREATE
        });
    } catch (error) {
        if (error.message.includes('Email is already in use')) {
            return res.status(400).send({
                statusCode: 400,
                message: 'The email address is already registered.'
            });
        }
        if (error.message.includes('Phone number is already in use')) {
            return res.status(400).send({
                statusCode: 400,
                message: 'The phone number is already registered.'
            });
        }
        if (error.message.includes('Validation error')) {
            return res.status(400).send({
                statusCode: 400,
                message: error.message
            });
        }
        return res.status(500).send({
            statusCode: 500,
            message: 'An error occurred while creating the staff user.'
        });
    }
});

const getAdminStaffUsers = catchAsync(async (req, res) => {
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'search', 'status']);
    options['loginedInUser'] = req.user._id;
    const result = await adminStaffService.queryAdminStaffUsers(options);
    return res.status(200).send({
        statusCode: CONSTANTS.SUCCESSFUL,
        data: {
            docs: result.docs.length ? result.docs.map(staff => ({
                ...staff,
                role: staff.role ? {
                    _id: staff.role._id,
                    name: staff.role.name
                } : null,
            })) : [],
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
        message: CONSTANTS.ADMIN_STAFF_LIST,
    });
});

const getAdminStaffUser = catchAsync(async (req, res) => {
    const staff = await adminStaffService.getAdminStaffUserById(req.params.staffId);
    if (!staff) {
        return res.status(404).send({
            data: {},
            statusCode: CONSTANTS.NOT_FOUND,
            message: CONSTANTS.ADMIN_NOT_FOUND
        });
    }
    return res.status(200).send({
        data: staff,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.ADMIN_STAFF_DETAILS
    });
});

const updateAdminStaffUser = catchAsync(async (req, res) => {
    const staff = await adminStaffService.updateAdminStaffUserById(req.params.staffId, req.body);
    return res.status(200).send({
        data: staff,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.ADMIN_STAFF_UPDATE
    });
});

const deleteAdminStaffUser = catchAsync(async (req, res) => {
    const details = await adminStaffService.deleteAdminStaffUserById(req.params.staffId);
    if (!details) {
        return res.status(404).send({
            data: {},
            statusCode: CONSTANTS.NOT_FOUND,
            message: CONSTANTS.ADMIN_NOT_FOUND
        });
    }
    return res.status(200).send({
        data: details,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.ADMIN_STAFF_STATUS_DELETE
    });
});

const getAdminStaffUsersWithoutPagination = catchAsync(async (req, res) => {
    const options = pick(req.query, ['searchBy', 'companyId']);
    const result = await adminStaffService.queryUsersWithoutPagination(options);
    return res.status(200).send({
        data: result,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.ADMIN_STAFF_LIST
    });
});

const updateProfile = catchAsync(async (req, res) => {
    let result;
    if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
        const profilePhoto = await s3Service.uploadImage(req.files.profilePhoto[0]);
        if (profilePhoto) {
            req.body.profilePhoto = profilePhoto.data?.Key || '';
        }
    }
    if (req.user && req.user.type === 'superadmin') {
        result = await adminAuthService.updateAdminById(req.user._id, req.body);
    } else {
        result = await adminStaffService.updateAdminStaffUserById(req.user._id, req.body);
    }
    return res.status(200).send({
        data: result,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: CONSTANTS.ADMIN_STAFF_UPDATE
    });
});

const getStaffWithRole = catchAsync(async (req, res) => {
    const staff = await adminStaffService.getStaffWithRole(req.params.staffId);
    res.status(200).send({
        data: staff,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: 'Staff details retrieved successfully'
    });
});

const getUsers = catchAsync(async (req, res) => {
    const users = await AdminStaffModel.find();
    res.status(200).send({
        data: users,
        statusCode: CONSTANTS.SUCCESSFUL,
        message: 'User list retrieved successfully'
    });
});

const adminResetStaffPassword = catchAsync(async (req, res) => {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone) {
        return res.status(400).send({
            data: {},
            statusCode: CONSTANTS.BAD_REQUEST,
            message: "Email or phone is required."
        });
    }
    const result = await adminStaffService.adminResetPasswordForStaff(emailOrPhone);
    return res.status(result.code).send(result);
});

const changeStaffPassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(CONSTANTS.BAD_REQUEST).send({
            statusCode: CONSTANTS.BAD_REQUEST,
            message: "Current password and new password are required."
        });
    }

    // Retrieve the staff member's details
    const staffDetails = await adminStaffService.getAdminStaffUserById(req.user._id);

    // Verify current password
    if (!staffDetails || !(await staffDetails.isPasswordMatch(currentPassword))) {
        return res.status(CONSTANTS.UNAUTHORIZED).send({
            statusCode: CONSTANTS.UNAUTHORIZED,
            message: CONSTANTS.OLD_PASSWORD_MSG
        });
    }   

    // Update password using the newly created function
    const result = await adminStaffService.updateStaffPasswordById(req.user._id, newPassword);

    return res.status(result.statusCode).send({
        statusCode: result.statusCode,
        message: result.message
    });
});

module.exports = {
    createAdminStaffUser,
    getAdminStaffUsers,
    getAdminStaffUser,
    updateAdminStaffUser,
    deleteAdminStaffUser,
    getAdminStaffUsersWithoutPagination,
    updateProfile,
    getStaffWithRole,
    getUsers,
    adminResetStaffPassword,
    changeStaffPassword
};