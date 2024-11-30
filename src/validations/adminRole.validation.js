const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createRole = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        resource: Joi.array(),
        company: Joi.string().allow('').allow(null),
        isDelete: Joi.number().allow('').allow(null),
    }),
};

const getRoles = {
    query: Joi.object().keys({
        name: Joi.string(),
        role: Joi.string(),
        sortBy: Joi.string(),
        searchBy: Joi.string().allow('').allow(null),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};

const getRole = {
    params: Joi.object().keys({
        roleId: Joi.string().custom(objectId),
    }),
};

const updateRole = {
    params: Joi.object().keys({
        roleId: Joi.required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            name: Joi.string().optional(),
            resource: Joi.array().optional(),
            company: Joi.string().allow('').allow(null).optional(),
            status: Joi.number().optional(),
            isDelete: Joi.number().allow('').allow(null).optional(),
            createdAt: Joi.date().optional(),
            updatedAt: Joi.date().optional(),
            id: Joi.string().optional(),
        })
        .min(1),
};

const deleteRole = {
    params: Joi.object().keys({
        roleId: Joi.string().custom(objectId),
    }),
};

const getActiveRoles = {
    query: Joi.object().keys({
        companyId: Joi.string().required(),
        searchBy: Joi.string().optional(),
    }),
};

module.exports = {
    createRole,
    getRoles,
    getRole,
    updateRole,
    deleteRole,
    getActiveRoles
};