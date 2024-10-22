const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createStaff = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    countryCode: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
    role: Joi.string().allow('').allow(null)
  }),
};

const getStaffs = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    searchBy: Joi.string().allow('').allow(null),
    status: Joi.string().allow('').allow(null),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getStaff = {
  params: Joi.object().keys({
    staffId: Joi.string().custom(objectId),
  }),
};

const updateStaff = {
  params: Joi.object().keys({
    staffId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      phone: Joi.string().required(),  // Add phone validation for update
      countryCode: Joi.string().required(),  // Add countryCode validation for update
      email: Joi.string().required(),
      password: Joi.string().allow('').allow(null),
      address: Joi.string().allow('').allow(null),
      city: Joi.string().allow('').allow(null),
      state: Joi.string().allow('').allow(null),
      zipcode: Joi.string().allow('').allow(null),
      profilePhoto: Joi.string().allow('').allow(null),
      role: Joi.string().allow('').allow(null),
      status: Joi.number().required(),
      isDelete: Joi.number().allow('').allow(null),
      createdAt: Joi.date(),
      updatedAt: Joi.date(),
      id: Joi.string()
    })
    .min(1),
};

const deleteStaff = {
  params: Joi.object().keys({
    staffId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createStaff,
  getStaffs,
  getStaff,
  updateStaff,
  deleteStaff,
};