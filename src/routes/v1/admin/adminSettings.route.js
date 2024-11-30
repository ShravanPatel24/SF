const express = require('express');
const { adminAuth } = require('../../../middlewares');
const { adminSettingController } = require('../../../controllers');

const router = express.Router();

router.post('/create', adminAuth(), adminSettingController.createSettings);
router.get('/get', adminAuth(), adminSettingController.getSettings);
router.patch('/:settingsId', adminAuth(), adminSettingController.updateSettings);
router.delete('/:settingsId', adminAuth(), adminSettingController.deleteSettings);

module.exports = router;