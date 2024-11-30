const catchAsync = require('../utils/catchAsync');
const { DashboardService } = require('../services');
const CONSTANT = require('../config/constant');

const getDashboardData = catchAsync(async (req, res) => {
    const { businessTypeId } = req.query;

    const result = await DashboardService.getDashboardCount(businessTypeId);
    res.send({
        data: result,
        statusCode: CONSTANT.SUCCESSFUL,
        message: 'Dashboard data retrieved successfully',
    });
});

module.exports = {
    getDashboardData
};