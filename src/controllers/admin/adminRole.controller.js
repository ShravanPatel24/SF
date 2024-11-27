const catchAsync = require('../../utils/catchAsync');
const { adminRoleService } = require('../../services');
const CONSTANTS = require('../../config/constant');

const createRole = catchAsync(async (req, res, next) => {
    try {
        const role = await adminRoleService.createRole(req.body);
        return res.status(200).send({ statusCode: 200, message: CONSTANTS.ROLE_CREATE, data: role });
    } catch (error) {
        console.error("Error in createRole:", error.message);
        const statusCode = error.message.includes("already exists") ? 400 : 500;
        const message = error.message || "Failed to create role.";
        return res.status(statusCode).send({ statusCode, message });
    }
});

const getRoles = catchAsync(async (req, res, next) => {
    try {
        const roles = await adminRoleService.queryRoles(req.query);
        return res.status(200).send({
            statusCode: 200,
            message: CONSTANTS.ROLE_LIST,
            data: roles
        });
    } catch (error) {
        next(error);
    }
});

const getRole = catchAsync(async (req, res, next) => {
    try {
        const role = await adminRoleService.getRoleById(req.params.roleId);
        return res.status(200).send({ statusCode: 200, message: CONSTANTS.ROLE_DETAILS, data: role });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal server error";
        return res.status(statusCode).send({ statusCode, message });
    }
});

const updateRole = catchAsync(async (req, res, next) => {
    try {
        const role = await adminRoleService.updateRoleById(req.params.roleId, req.body);
        return res.status(200).send({ statusCode: 200, message: CONSTANTS.ROLE_UPDATED, data: role });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal server error";
        return res.status(statusCode).send({ statusCode, message });
    }
});

const deleteRole = catchAsync(async (req, res, next) => {
    try {
        const role = await adminRoleService.deleteRoleById(req.params.roleId);
        return res.status(200).send({ statusCode: 200, message: CONSTANTS.ROLE_DELETED, data: role });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal server error";
        return res.status(statusCode).send({ statusCode, message });
    }
});

const getRolesWithoutPagination = catchAsync(async (req, res, next) => {
    const roles = await adminRoleService.queryRolesWithoutPagination(req.query);
    return res.status(200).send({ statusCode: 200, message: CONSTANTS.ROLE_LIST, data: roles });
});

const getActiveRoles = catchAsync(async (req, res, next) => {
    try {
        const roles = await adminRoleService.queryRolesWithoutPagination({
            companyId: req.query.companyId,
            searchBy: req.query.searchBy,
            status: 1, // Fetch only active roles
        });
        return res.status(200).send({
            statusCode: 200,
            message: CONSTANTS.ROLE_LIST,
            data: roles,
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal server error";
        return res.status(statusCode).send({ statusCode, message });
    }
});

module.exports = {
    createRole,
    getRoles,
    getRole,
    updateRole,
    deleteRole,
    getRolesWithoutPagination,
    getActiveRoles
};