const express = require('express');
const router = express.Router();
const { userAuth, adminAuth } = require('../../middlewares');
const { VariantsController } = require('../../controllers');


router.post('/create', adminAuth(), VariantsController.createVariant);
router.get('/list', adminAuth(), VariantsController.getVariants);
router.get('/:variantId', adminAuth(), VariantsController.getVariantById);
router.patch('/:variantId', adminAuth(), VariantsController.updateVariant);
router.delete('/:variantId', adminAuth(), VariantsController.deleteVariant);

router.get('/partner/list', userAuth(), VariantsController.getVariantsForPartner);

module.exports = router;
