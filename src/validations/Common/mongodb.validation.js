const { body, param } = require("express-validator");

/**
 *
 * @param {string} idName
 * @description A common validator responsible to validate MongoDB IDs passed in the URL's path variable
 */
const mongoIdPathVariableValidator = (idName) => {
    return [
        param(idName).notEmpty().isMongoId().withMessage(`Invalid ${idName}`),
    ];
};

/**
 *
 * @param {string} idName
 * @description A common validator responsible to validate MongoDB IDs passed in the request body
 */
const mongoIdRequestBodyValidator = (idName) => {
    return [body(idName).notEmpty().isMongoId().withMessage(`Invalid ${idName}`)];
};

module.exports = {
    mongoIdPathVariableValidator,
    mongoIdRequestBodyValidator,
};