const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { DashboardService } = require('../services');
const CONSTANT = require('../config/constant');

const getDashboardData = catchAsync(async (req, res) => {
    const result = await DashboardService.getDashboardCount();
    res.send({ data: result, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CAREER_LIST });
});

module.exports = {
    getDashboardData
};