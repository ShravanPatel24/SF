const express = require('express');
const { adminAuth } = require('../../middlewares');
const { DashboardController } = require('../../controllers');

const router = express.Router();

router
    .route('/')
    .get(adminAuth('getDashboardData'), DashboardController.getDashboardData)


module.exports = router;