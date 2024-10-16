const { UserModel, BankDetailModel } = require('../models');
const CONSTANTS = require('../config/constant');

/**
 * Create or update bank details for a partner
 * @param {ObjectId} userId
 * @param {Object} bankDetails
 * @returns {Promise<BankDetail>}
 */
const createOrUpdateBankDetails = async (userId, bankDetails) => {
    const partner = await UserModel.findById(userId);
    if (!partner || partner.type !== 'partner') { throw new Error(CONSTANTS.PARTNER_NOT_FOUND_MSG) }
    let bankDetail = await BankDetailModel.findOne({ userId });
    if (bankDetail) {
        bankDetail = Object.assign(bankDetail, bankDetails);
        await bankDetail.save();
        return bankDetail;
    } else {
        const newBankDetail = new BankDetailModel({
            ...bankDetails,
            userId
        });
        await newBankDetail.save();
        return newBankDetail;
    }
};

/**
 * Update bank details for a partner
 * @param {ObjectId} userId
 * @param {Object} bankDetails
 * @returns {Promise<BankDetail>}
 */
const updateBankDetails = async (bankId, bankDetails) => {
    let existingBankDetails = await BankDetailModel.findById(bankId);
    if (!existingBankDetails) { throw new Error(CONSTANTS.BANK_DETAILS_NOT_FOUND) }
    existingBankDetails = Object.assign(existingBankDetails, bankDetails);
    await existingBankDetails.save();
    return existingBankDetails;
};

/**
 * Get bank details by userId
 * @param {ObjectId} userId
 * @returns {Promise<BankDetail>}
 */
const getBankDetailsByUserId = async (userId) => {
    const bankDetails = await BankDetailModel.findOne({ userId });
    if (!bankDetails) { throw new Error(CONSTANTS.BANK_DETAILS_NOT_FOUND) }
    return bankDetails;
};

/**
 * Delete bank details by userId
 * @param {ObjectId} userId
 * @returns {Promise<void>}
 */
const deleteBankDetailsByUserId = async (userId) => {
    const bankDetails = await BankDetailModel.findOneAndDelete({ userId });
    if (!bankDetails) { throw new Error(CONSTANTS.BANK_DETAILS_NOT_FOUND) }
};

module.exports = {
    createOrUpdateBankDetails,
    updateBankDetails,
    getBankDetailsByUserId,
    deleteBankDetailsByUserId,
};