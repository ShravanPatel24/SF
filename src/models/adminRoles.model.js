const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const mongoosePaginate = require('mongoose-paginate-v2');

const adminRolesSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        resource: [
            {
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
            },
        ],
        status: {
            type: Number,
            default: 1, // 1 for active, 0 for inactive
        },
        isDelete: {
            type: Number,
            default: 1, // 1 for active, 0 for deleted (soft delete)
        },
    },
    {
        timestamps: true,
    }
);

// Add a compound unique index for name and isDelete
adminRolesSchema.index({ name: 1, isDelete: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

// Add plugins
adminRolesSchema.plugin(toJSON);
adminRolesSchema.plugin(mongoosePaginate);

/**
 * @typedef AdminRoles
 */
const AdminRoles = mongoose.model('AdminRoles', adminRolesSchema);

module.exports = AdminRoles;