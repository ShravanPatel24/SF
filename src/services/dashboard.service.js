const mongoose = require('mongoose');
const { UserModel, ContactUsModel, OrderModel } = require('../models');

const getDashboardCount = async (businessTypeId) => {
    // Filters for businessType if provided
    const businessTypeFilter = businessTypeId
        ? { businessType: new mongoose.Types.ObjectId(businessTypeId) }
        : {};

    // Queries
    const partnerQuery = { type: 'partner', status: 1, isDelete: 1, ...businessTypeFilter };
    const orderQuery = { ...businessTypeFilter };

    // Counts
    const usersCount = await UserModel.countDocuments({ type: 'user', status: 1, isDelete: 1 });
    const partnersCount = await UserModel.countDocuments(partnerQuery);
    const ordersCount = await OrderModel.countDocuments(orderQuery);
    const contactUsCount = await ContactUsModel.countDocuments({ isDelete: 1 });

    // Recent Data
    const recentUsers = await UserModel.find({ type: 'user', isDelete: 1 })
        .limit(10)
        .sort({ createdAt: -1 });

    const recentPartners = await UserModel.find(partnerQuery)
        .limit(10)
        .sort({ createdAt: -1 });

    const recentOrders = await OrderModel.find(orderQuery)
        .limit(10)
        .sort({ createdAt: -1 });

    return {
        counts: {
            users: usersCount,
            partners: partnersCount,
            orders: ordersCount,
            contactUs: contactUsCount,
        },
        listings: {
            recentUsers,
            recentPartners,
            recentOrders,
        },
    };
};

module.exports = {
    getDashboardCount,
};