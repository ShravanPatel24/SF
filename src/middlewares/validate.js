const Joi = require('joi');
const CONSTANT = require('../config/constant');
const pick = require('../utils/pick');

const validate = (schema) => (req, res, next) => {
  // Extract only the relevant parts of the request (params, query, body)
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));

  // Compile and validate the schema
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false }) // Collect all errors
    .validate(object);

  // If validation fails
  if (error) {
    // Format the error message
    let errorMessage = error.details.map((details) => details.message).join(', ');
    errorMessage = errorMessage.replace(/['"]+/g, ''); // Remove extra quotes

    // Send a 400 response with the error message
    return res.status(CONSTANT.BAD_REQUEST).json({
      statusCode: CONSTANT.BAD_REQUEST,
      message: errorMessage,
      data: {},
    });
  }

  // If validation passes, assign the validated values to the request object
  Object.assign(req, value);
  return next();
};

module.exports = validate;
