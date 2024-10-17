const { UserModel, ContactUsModel } = require('../models');

const getDashboardCount = async () => {
    const usersCount = await UserModel.countDocuments({ status: 1, isDelete: 1, type: 'user' });
    const patnerCount = await UserModel.countDocuments({ status: 1, isDelete: 1, type: 'partner' });
    const contactUsCount = await ContactUsModel.countDocuments({ isDelete: 1 });
    const recentUsers = await UserModel.find({ isDelete: 1, type: 'user' }).limit(10).sort({ createdAt: -1 });
    const recentPartners = await UserModel.find({ isDelete: 1, type: 'partner' }).limit(10).sort({ createdAt: -1 });
   
    return {
        usersCount,
        patnerCount,
        recentUsers,
        contactUsCount,
        recentPartners
    }
}

module.exports = {
    getDashboardCount
}