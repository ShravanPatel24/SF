const { BusinessModel, UserModel, BusinessTypeModel } = require("../models");
const CONSTANT = require("../config/constant");
const awsS3Service = require("../lib/aws_S3");

const createBusinessForPartner = async (partnerId, businessName, businessType, businessDescription, mobile, email, businessAddress, openingDays, openingTime, closingTime, sameTimeForAllDays, uniformTiming, daywiseTimings, images) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error('Partner not found or not a valid partner') }
    if (partner.name === businessName) { throw new Error('Business name cannot be the same as the partner\'s name') }

    const validBusinessType = await BusinessTypeModel.findById(businessType);
    if (!validBusinessType) { throw new Error('Invalid business type provided') }

    const business = new BusinessModel({
        businessName,
        partner: partnerId,
        businessType,
        businessDescription,
        mobile,
        email,
        businessAddress,
        openingDays,
        openingTime,
        closingTime,
        sameTimeForAllDays,
        uniformTiming,
        daywiseTimings,
        businessImages: images || [],
    });
    await business.save();
    await UserModel.findByIdAndUpdate(partnerId, { businessId: business._id });
    return business;
};

const getBusinessesForPartner = async (partnerId) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== "partner") { throw new Error('Partner not found or not a valid partner') }
    const businesses = await BusinessModel.find({ partner: partnerId })
        .populate('businessType', 'name isProduct')
        .populate('partner', 'name')
        .exec();
    return businesses;
};

const queryBusinesses = async (partnerId, options) => {
    const partner = await UserModel.findById(partnerId);
    if (!partner || partner.type !== 'partner') { throw new Error('Partner not found or not a valid partner') }
    const { page = 1, limit = 10, sortBy, searchBy, businessType } = options;
    let query = { partner: partnerId };

    if (businessType) { query.businessType = businessType }
    if (searchBy) { query.businessName = { $regex: searchBy, $options: 'i' } }

    const businesses = await BusinessModel.paginate(query, {
        page,
        limit,
        sort: { createdAt: sortBy === 'desc' ? -1 : 1 },
        populate: [
            { path: 'businessType', select: 'businessType _id' },
            { path: 'partner', select: 'name _id' },
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
    const { businessName, businessDescription, mobile, email, businessAddress, openingDays, sameTimeForAllDays, uniformTiming, daywiseTimings, images } = updateBody;
    const business = await BusinessModel.findById(businessId);
    if (!business) { throw new Error('Business not found') }
    const owner = await UserModel.findById(business.partner);
    if (owner.name === businessName) { throw new Error("Business name cannot be the same as the partner's name") }

    business.businessName = businessName || business.businessName;
    business.businessDescription = businessDescription || business.businessDescription;
    business.mobile = mobile || business.mobile;
    business.email = email || business.email;
    business.businessAddress = businessAddress || business.businessAddress;
    business.openingDays = openingDays || business.openingDays;
    business.openingTime = openingTime || business.openingTime;
    business.closingTime = closingTime || business.closingTime;
    business.sameTimeForAllDays = sameTimeForAllDays !== undefined ? sameTimeForAllDays : business.sameTimeForAllDays;
    business.uniformTiming = uniformTiming || business.uniformTiming;
    business.daywiseTimings = daywiseTimings || business.daywiseTimings;

    // If images are uploaded
    if (files && files.length > 0) {
        const uploadedImages = await awsS3Service.uploadDocuments(files, 'businessImages');
        business.businessImages = uploadedImages.map(upload => upload.location);
    } else if (images) { business.businessImages = images }

    await business.save();
    return business;
};

/**
 * Delete a business by ID
 * @param {ObjectId} businessId
 * @returns {Promise<void>}
 */
const deleteBusinessById = async (businessId) => {
    const business = await BusinessModel.findById(businessId);
    if (!business) { throw new Error('Business not found') }
    await BusinessModel.findByIdAndDelete(businessId);
};

const findBusinessesNearUser = async (userLatitude, userLongitude, radiusInKm) => {
    const businesses = await BusinessModel.find({
        "businessAddress.location": {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [userLongitude, userLatitude]
                },
                $maxDistance: radiusInKm * 1000
            }
        }
    });
    return businesses;
};

module.exports = {
    createBusinessForPartner,
    getBusinessesForPartner,
    queryBusinesses,
    updateBusinessById,
    deleteBusinessById,
    findBusinessesNearUser
};
