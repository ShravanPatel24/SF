const { AddressModel } = require('../models');

/**
 * Add a new address for a user.
 */
const addAddress = async (userId, addressData) => {
    if (addressData.isDefault) {
        await AddressModel.updateMany({ user: userId, isDefault: true }, { isDefault: false });
    }
    const address = new AddressModel({ ...addressData, user: userId });
    return await address.save();
};

/**
 * Get all addresses for a user.
 */
const getAddresses = async (userId, page = 1, limit = 10) => {
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { createdAt: -1 },
        lean: true
    };

    return await AddressModel.paginate({ user: userId }, options);
};

/**
 * Update an address.
 */
const updateAddress = async (addressId, userId, updateData) => {
    if (updateData.isDefault) {
        await AddressModel.updateMany({ user: userId, isDefault: true }, { isDefault: false });
    }
    return await AddressModel.findOneAndUpdate({ _id: addressId, user: userId }, updateData, { new: true });
};

/**
 * Delete an address.
 */
const deleteAddress = async (addressId, userId) => {
    return await AddressModel.findOneAndDelete({ _id: addressId, user: userId });
};

module.exports = {
    addAddress,
    getAddresses,
    updateAddress,
    deleteAddress,
};
