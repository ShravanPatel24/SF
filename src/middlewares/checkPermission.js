const { AdminStaffModel, AdminModel } = require('../models'); // Include both models

const checkPermission = (moduleName, requiredPermission) => {
    return async (req, res, next) => {
        try {
            // Try to find the user in AdminStaffModel first
            let staff = await AdminStaffModel.findById(req.user._id).populate('role');

            // If the user is not found in AdminStaffModel, check AdminModel (for Super Admins)
            if (!staff) {
                staff = await AdminModel.findById(req.user._id).populate('role');
            }

            // Log the user details for debugging
            console.log('Authenticated Staff:', staff);

            // If user is not found, deny access
            if (!staff) {
                return res.status(403).send({ code: 403, message: 'Access denied' });
            }

            // Check if the user is a Super Admin and bypass permission checks
            if (staff.type === 'superadmin') {
                console.log('Super Admin access granted');
                return next(); // Bypass permission checks for Super Admin
            }

            // Proceed with regular permission checks for other users
            if (staff.role) {
                const hasPermission = staff.role.resource.some(resource => {
                    return resource.moduleName === moduleName && resource.permissions.includes(requiredPermission);
                });

                // If the user does not have the required permission, deny access
                if (!hasPermission) {
                    return res.status(403).send({ code: 403, message: 'You do not have the required permissions' });
                }

                console.log('Permission granted:', moduleName, requiredPermission);
                next(); // Permission granted, proceed
            } else {
                return res.status(403).send({ code: 403, message: 'Access denied' });
            }

        } catch (error) {
            console.error('Error in permission check:', error);
            return res.status(500).send({ code: 500, message: 'Internal server error' });
        }
    };
};

module.exports = checkPermission;
