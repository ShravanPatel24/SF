const express = require('express');
const router = express.Router();
const { userAuth } = require('../../middlewares');
const { AddressController } = require('../../controllers');

router.post('/', userAuth(), AddressController.addAddress);
router.get('/', userAuth(), AddressController.getAddresses);
router.patch('/:addressId', userAuth(), AddressController.updateAddress);
router.delete('/:addressId', userAuth(), AddressController.deleteAddress);

module.exports = router;