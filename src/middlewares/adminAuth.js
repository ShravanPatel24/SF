const config = require('../config/config');
const jwt = require('jsonwebtoken');
const CONSTANT = require('../config/constant');
const { AdminModel, AdminStaffModel } = require('../models'); // Make sure you include both models

const adminAuth = () => async (req, res, next) => {
    let bearerHeader = req.headers["authorization"] || req.query["api_key"];
    
    // Check if the authorization header is provided
    if (!bearerHeader) {
        return res.status(401).send({ statusCode: CONSTANT.UNAUTHORIZED, message: CONSTANT.NO_TOKEN });
    }

    // Extract the token from the header
    let bearerToken = bearerHeader.split(" ")[1];

    try {
        // Verify the token
        const decoded = jwt.verify(bearerToken, config.jwt.secret);

        // Find the user in both AdminModel (Super Admin) and AdminStaffModel (Staff)
        let user = await AdminModel.findById(decoded.sub) || await AdminStaffModel.findById(decoded.sub);

        // If user is not found, return unauthorized
        if (!user) {
            return res.status(401).send({ statusCode: CONSTANT.UNAUTHORIZED, message: 'Session is expired, please login again!' });
        }

        // Check if the user's account is deactivated or deleted
        if (user.status === 0) {
            return res.status(401).send({ statusCode: CONSTANT.UNAUTHORIZED, message: CONSTANT.ACCOUNT_DEACTIVATE });
        }
        if (user.isDelete === 0) {
            return res.status(401).send({ statusCode: CONSTANT.UNAUTHORIZED, message: CONSTANT.ACCOUNT_DELETE });
        }

        // Attach the authenticated user to the request object
        req.user = user;
        next(); // Continue to the next middleware or route handler

    } catch (err) {
        return res.status(401).send({ statusCode: CONSTANT.UNAUTHORIZED, message: 'Session is expired, please login again!' });
    }
};

module.exports = adminAuth;
