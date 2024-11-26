const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { businessValidation } = require('../../validations');
const { businessController } = require('../../controllers');

const router = express.Router();

// Existing routes
router.get('/hotels/nearby', businessController.getHotelsNearUser);
router.get('/guest', businessController.getAllBusinesses);
router.get('/guest/:businessId', businessController.getBusinessByIdForGuest);
router.get('/near', validate(businessValidation.getBusinessesNearUser), businessController.getBusinessesNearUser);

// Partner's business routes
router.get('/partner/:partnerId', userAuth(), validate(businessValidation.getBusinessByPartnerId), businessController.getBusinessesForPartner);
router.get('/type/:businessTypeId', userAuth(), businessController.getBusinessesByType);
router.get('/dashboard/counts', userAuth(), businessController.getDashboardCounts);

// New Route for Retrieving Orders by Type
router.get('/dashboard/orders', userAuth(), businessController.getOrderListByType);  // Retrieve specific order lists based on type

// Business routes with businessId
router
    .route('/:businessId')
    .get(businessController.getBusinessById)  // Get business by businessId
    .patch(
        userAuth('updateById'),
        upload.fields([
            { name: 'bannerImages', maxCount: 10 },
            { name: 'galleryImages', maxCount: 10 }
        ]),
        validate(businessValidation.update),
        businessController.updateBusiness
    )  // Update business
    .delete(userAuth('deleteById'), validate(businessValidation.deleteById), businessController.deleteBusiness);  // Delete business

// Create a new business for a partner
router.post(
    '/',
    userAuth('create'),
    upload.fields([
        { name: 'bannerImages', maxCount: 10 },
        { name: 'galleryImages', maxCount: 10 }
    ]),
    validate(businessValidation.create),
    businessController.createBusinessForPartner
);

router.delete('/:businessId/images', userAuth('deleteImages'), businessController.deleteBusinessImages);

module.exports = router;