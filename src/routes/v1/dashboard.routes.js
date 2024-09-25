const express = require('express');
const { adminAuth, basicAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { DashboardController } = require('../../controllers');

const router = express.Router();

router
    .route('/')
    .get(adminAuth('getDashboardData'), DashboardController.getDashboardData)


module.exports = router;