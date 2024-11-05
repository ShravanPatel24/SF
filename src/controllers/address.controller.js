const { AddressService } = require('../services');
const CONSTANTS = require('../config/constant')

const addAddress = async (req, res) => {
    const userId = req.user._id;
    const addressData = req.body;
    const address = await AddressService.addAddress(userId, addressData);
    res.status(201).json({ statusCode: 201, message: 'Address added successfully', data: address });
};

const getAddresses = async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const addresses = await AddressService.getAddresses(userId, page, limit);

    res.status(200).json({
        statusCode: 200,
        message: CONSTANTS.LIST,
        data: {
            docs: addresses.docs,
            totalDocs: addresses.totalDocs,
            limit: addresses.limit,
            totalPages: addresses.totalPages,
            page: addresses.page,
            pagingCounter: addresses.pagingCounter,
            hasPrevPage: addresses.hasPrevPage,
            hasNextPage: addresses.hasNextPage,
            prevPage: addresses.prevPage,
            nextPage: addresses.nextPage,
        }
    });
};

const updateAddress = async (req, res) => {
    const userId = req.user._id;
    const addressId = req.params.addressId;
    const updateData = req.body;
    const updatedAddress = await AddressService.updateAddress(addressId, userId, updateData);
    res.status(200).json({ statusCode: 200, message: 'Address updated successfully', data: updatedAddress });
};

const deleteAddress = async (req, res) => {
    const userId = req.user._id;
    const addressId = req.params.addressId;
    await AddressService.deleteAddress(addressId, userId);
    res.status(200).json({ statusCode: 200, message: 'Address deleted successfully' });
};

module.exports = {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress,
};