const pick = require('../../utils/pick');
const catchAsync = require('../../utils/catchAsync');
const { adminRoleService } = require('../../services');
const CONSTANT = require('../../config/constant');

const createRole = catchAsync(async (req, res) => {
    const role = await adminRoleService.createRole(req.body);
    if (role.code === 400) { return res.status(400).send({ data: {}, code: 400, message: role.message }) }
    return res.status(200).send({ data: role, code: 200, message: CONSTANT.ROLE_CREATE });
});

const assignRoleToStaff = catchAsync(async (req, res) => {
    const { staffId, roleId } = req.body;
    const staff = await adminStaffService.getAdminStaffUserById(staffId);

    if (!staff) {
        return res.status(404).send({ data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.USER_NOT_FOUND });
    }

    staff.role = roleId;
    await staff.save();

    return res.status(200).send({ data: staff, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ROLE_ASSIGNED });
});

const getRoles = catchAsync(async (req, res) => {
    const roles = await adminRoleService.queryRoles(req.query);
    res.status(200).send({ data: roles, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ROLE_LIST });
});

const getRole = catchAsync(async (req, res) => {
    const role = await adminRoleService.getRoleById(req.params.roleId);
    if (!role) {
        res.send({ data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.ROLE_NOT_FOUND });
    }
    res.send({ data: role, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ROLE_DETAILS });
});

const updateRole = catchAsync(async (req, res) => {
    const role = await adminRoleService.updateRoleById(req.params.roleId, req.body);
    res.status(200).send({ data: role, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ROLE_UPDATED });
});

const deleteRole = catchAsync(async (req, res) => {
    const role = await adminRoleService.deleteRoleById(req.params.roleId);
    res.status(200).send({ data: role, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ROLE_DELETED });
});

const getRolesWithoutPagination = catchAsync(async (req, res) => {
    const options = pick(req.query, ['searchBy']);
    const result = await adminRoleService.queryRolesWithoutPagination(options);
    res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ROLE_LIST });
});

module.exports = {
    createRole,
    assignRoleToStaff,
    getRoles,
    getRole,
    updateRole,
    deleteRole,
    getRolesWithoutPagination
};
