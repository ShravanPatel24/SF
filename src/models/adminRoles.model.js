const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const mongoosePaginate = require('mongoose-paginate-v2');

const adminRolesSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    resource: [{
        moduleName: {
            type: String,
            required: true,
        },
        moduleId: {
            type: String,
            required: true,
        },
        permissions: {
            type: [String],
            enum: ['view', 'add', 'edit', 'delete', 'selectedAll', 'list'],
            required: true,
        },
    }],
    status: {
        type: Number,
        default: 1, // 1 for active, 0 for inactive
    },
    isDelete: {
        type: Number,
        default: 1, // 1 for active, 0 for deleted (soft delete)
    },
}, {
    timestamps: true,
});

// add plugin that converts mongoose to json
adminRolesSchema.plugin(toJSON);
adminRolesSchema.plugin(mongoosePaginate);

/**
 * Check if role name is taken
 * @param {string} name - The role's name
 * @param {ObjectId} [excludeRoleId] - The id of the role to be excluded from the check
 * @returns {Promise<boolean>}
 */
adminRolesSchema.statics.isNameTaken = async function (name, excludeRoleId) {
    const condition = excludeRoleId
        ? { name, _id: { $ne: excludeRoleId }, isDelete: 1 }
        : { name, isDelete: 1 };

    const role = await this.findOne(condition);
    return !!role;
};

/**
 * @typedef AdminRoles
 */
const AdminRoles = mongoose.model('AdminRoles', adminRolesSchema);

module.exports = AdminRoles;