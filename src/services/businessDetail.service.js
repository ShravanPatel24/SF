const { BusinessDetailModel } = require("../models");
const CONSTANT = require("../config/constant");

const createBusinessForPartner = async (partnerId, businessName, businessType, details, images) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error('Partner not found or not a valid partner') }
    if (partner.name === businessName) { throw new Error('Business name cannot be the same as the partner\'s name') }
    const business = new BusinessDetailModel({ name: businessName, owner: partnerId, businessType, details: details || "", images });
    await business.save();
    return business;
};

const getBusinessesForPartner = async (partnerId) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error('Partner not found or not a valid partner') }
    const businesses = await BusinessDetailModel.find({ owner: partnerId })
        .populate('businessType', 'name isProduct')
        .populate('owner', 'name')
        .exec();
    return businesses;
};

const queryBusinesses = async (options) => {
    const { page = 1, limit = 10, sortBy, searchBy, businessType } = options;
    let query = {};
    if (businessType) { query.businessType = businessType }
    if (searchBy) { query.name = { $regex: searchBy, $options: 'i' } }
    const businesses = await BusinessDetailModel.paginate(query, {
        page,
        limit,
        sort: { createdAt: sortBy === 'desc' ? -1 : 1 },
        populate: [
            { path: 'businessType', select: 'name isProduct' },
            { path: 'owner', select: 'name' }
        ],
    });
    return businesses;
};

/**
 * Update a business by ID
 * @param {ObjectId} businessId
 * @param {Object} updateBody
 * @param {Array} files
 * @returns {Promise<Business>}
 */
const updateBusinessById = async (businessId, updateBody, files) => {
    const { businessName, businessType, details, images } = updateBody;
    const business = await BusinessDetailModel.findById(businessId);
    if (!business) { throw new Error('Business not found') }

    const owner = await UserModel.findById(business.owner);
    if (owner.name === businessName) { throw new Error("Business name cannot be the same as the partner's name") }

    business.name = businessName || business.name;
    business.businessType = businessType || business.businessType;
    business.details = details || business.details;

    // If images are uploaded
    if (files && files.length > 0) {
        const uploadedImages = await awsS3Service.uploadDocuments(files, 'businessImages');
        business.images = uploadedImages.map(upload => upload.location);
    } else if (images) {
        business.images = images;
    }
    await business.save();
    return business;
};

/**
 * Delete a business by ID
 * @param {ObjectId} businessId
 * @returns {Promise<void>}
 */
const deleteBusinessById = async (businessId) => {
    const business = await BusinessDetailModel.findById(businessId);
    if (!business) { throw new Error('Business not found') }
    await BusinessDetailModel.findByIdAndDelete(businessId);
};

module.exports = {
    createBusinessForPartner,
    getBusinessesForPartner,
    queryBusinesses,
    updateBusinessById,
    deleteBusinessById,
}