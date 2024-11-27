const Joi = require('joi');
const { objectId } = require('./custom.validation');

const create = {
  body: Joi.object().keys({
    name: Joi.string().required(),
  }),
};

const getList = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    searchBy: Joi.string().allow('').allow(null),
    status: Joi.string().allow('').allow(null),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    filterDateRange: Joi.alternatives().try(
      Joi.string().valid('past_3_months', 'past_6_months', '2023', '2022'),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}$/)
        .message('Custom date range must be in the format YYYY-MM-DD-YYYY-MM-DD')
    ).optional(),
  }),
};

const getById = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const update = {
  params: Joi.object().keys({
    id: Joi.string().required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().optional(),
      isProduct: Joi.boolean().optional(),
      status: Joi.string().optional(),
      isDelete: Joi.boolean().optional(),
      createdAt: Joi.date().optional(),
      updatedAt: Joi.date().optional(),
      id: Joi.string().optional(),
    })
    .min(1),
};

const deleteById = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  create,
  getList,
  getById,
  update,
  deleteById,
};
