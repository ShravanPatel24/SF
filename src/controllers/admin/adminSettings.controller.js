const { adminSettingService } = require('../../services');
const CONSTANTS = require('../../config/constant');
const catchAsync = require('../../utils/catchAsync');

// Create or update system settings
const createSettings = catchAsync(async (req, res) => {
    const settingsData = req.body;
    const result = await adminSettingService.createOrUpdateSettings(settingsData);
    res.status(200).json({
        statusCode: 200,
        message: CONSTANTS.CREATED,
        systemSettings: result,
    });
});

// Get system settings
const getSettings = catchAsync(async (req, res) => {
    const systemSettings = await adminSettingService.getSettings();
    res.status(200).json({
        statusCode: 200,
        message: CONSTANTS.LIST,
        systemSettings,
    });
});

// Update system settings
const updateSettings = catchAsync(async (req, res) => {
    const { settingsId } = req.params;
    const settingsData = req.body;

    const { systemSettings, message } = await adminSettingService.updateSettings(settingsId, settingsData);

    res.status(200).json({
        statusCode: 200,
        message,
        systemSettings,
    });
});

// Delete system settings
const deleteSettings = catchAsync(async (req, res) => {
    const { settingsId } = req.params;
    await adminSettingService.deleteSettings(settingsId);
    res.status(200).json({
        statusCode: 200,
        message: CONSTANTS.DELETED,
    });
});

module.exports = {
    createSettings,
    getSettings,
    updateSettings,
    deleteSettings,
};