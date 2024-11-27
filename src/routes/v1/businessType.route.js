const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { basicAuth, adminAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { businessTypeValidation } = require('../../validations');
const { businessTypeController } = require('../../controllers');

const router = express.Router();

// Get business types list for user without pagination
router.get('/for/user', basicAuth(), businessTypeController.getListWithoutPagination);

// Create a new business type
router.post(
    '/',
    adminAuth('create'),
    upload.fields([{ name: 'image', maxCount: 1 }]),
    validate(businessTypeValidation.create),
    businessTypeController.create
);

// Get a list of all business types with pagination
router.get(
    '/',
    adminAuth('gets'),
    validate(businessTypeValidation.getList),
    businessTypeController.getLists
);

// Get a business type by ID
router.get(
    '/:id',
    adminAuth('get'),
    validate(businessTypeValidation.getById),
    businessTypeController.getById
);

// Update a business type by ID
router.patch(
    '/:id',
    adminAuth('updateById'),
    upload.single('image'), // Handle single image upload for updates
    validate(businessTypeValidation.update),
    businessTypeController.updateById
);

// Delete a business type by ID
router.delete(
    '/:id',
    adminAuth('deleteById'),
    validate(businessTypeValidation.deleteById),
    businessTypeController.deleteById
);
router.get('/list/active', businessTypeController.getActiveBusinessTypes);

module.exports = router;