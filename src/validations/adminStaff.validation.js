const Joi = require('joi');
const { objectId } = require('./custom.validation');

const passwordComplexity = Joi.string()
  .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})"))
  .message('Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character (!, @, #, etc.)');

const createStaff = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    countryCode: Joi.string().required(),
    email: Joi.string().required(),
    password: passwordComplexity.required(),
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
      name: Joi.string().allow('', null),
      phone: Joi.string().allow('', null),
      countryCode: Joi.string().allow('', null),
      email: Joi.string().allow('', null),
      password: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      city: Joi.string().allow('', null),
      state: Joi.string().allow('', null),
      zipcode: Joi.string().allow('', null),
      profilePhoto: Joi.string().allow('', null),
      role: Joi.string().allow('', null),
      status: Joi.number().allow('', null),
      isDelete: Joi.number().allow('', null),
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