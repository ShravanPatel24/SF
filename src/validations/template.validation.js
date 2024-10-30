const Joi = require('joi');
const { objectId } = require('./custom.validation');
 
const createTemplate = {
    body: Joi.object().keys({
        templateName: Joi.string().required(),
        templateDisc: Joi.string().required(),
        subject: Joi.string(),
        fromName: Joi.string(),
        fromEmail: Joi.string(),
        templateFor: Joi.string().allow('').allow(null),
        templateType: Joi.number().integer(),
    }),
};
 
const getTemplates = {
    query: Joi.object().keys({
        // name: Joi.string(),
        sortBy: Joi.string(),
        search: Joi.string().allow('').allow(null),
        templateType: Joi.string().allow('').allow(null),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};
 
const getTemplate = {
    params: Joi.object().keys({
        templateId: Joi.string().custom(objectId),
        // jobId: Joi.string().custom(objectId),
    }),
};
 
const updateTemplate = {
    params: Joi.object().keys({
        templateId: Joi.required().custom(objectId),
    }),
    body: Joi.object()
        .keys({
            // guardId: Joi.string().required(),
            templateName: Joi.string(),
            templateDisc: Joi.string(),
            subject: Joi.string(),
            fromName: Joi.string(),
            fromEmail: Joi.string(),
            status: Joi.number(),
            isDelete: Joi.number().allow('').allow(null),
            createdAt: Joi.date(),
            updatedAt: Joi.date(),
            id: Joi.string()
        })
        .min(1),
};
 
const deleteTemplate = {
    params: Joi.object().keys({
        templateId: Joi.string().custom(objectId),
    }),
};
 
module.exports = {
    createTemplate,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
};