const jwt = require('jsonwebtoken');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { UserModel } = require('../models');

const verifyJWT = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token received:", token);

    if (!token) {
        console.error("No token provided");
        return next(new ApiError(401, "No token provided"));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded);

        const user = await UserModel.findById(decoded.sub || decoded._id);
        console.log("User found:", user);

        if (!user) {
            console.error("User not found");
            return next(new ApiError(401, "User not found"));
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        next(new ApiError(401, "Invalid token"));
    }
};

module.exports = verifyJWT;