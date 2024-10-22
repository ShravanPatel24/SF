const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { businessValidation } = require('../../validations');
const { businessController } = require('../../controllers');

const router = express.Router();

// Guest user route to get all businesses
router.get('/guest', businessController.getAllBusinesses); // Allow guests to get all businesses

// Route to get businesses near a user (for both guests and authenticated users)
router.get('/near', validate(businessValidation.getBusinessesNearUser), businessController.getBusinessesNearUser);

// Partner's business routes
router.get('/partner/:partnerId', userAuth(), validate(businessValidation.getBusinessByPartnerId), businessController.getBusinessesForPartner);

// Route to get businesses by businessTypeId
router.get('/type/:businessTypeId', userAuth(), businessController.getBusinessesByType);

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

// Route to get dashboard counts for a partner
router.get('/dashboard/counts', userAuth(), businessController.getDashboardCounts);

module.exports = router;