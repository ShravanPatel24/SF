const express = require('express');
const { adminAuthController } = require('../../controllers')
const router = express.Router();

router.get('/preview', adminAuthController.getMedia);


module.exports = router;