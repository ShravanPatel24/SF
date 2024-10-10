const catchAsync = require('../utils/catchAsync');
const { StaticContentModel } = require('../models');
const CONSTANT = require('../config/constant');
const mongoose = require('mongoose');

const getStaticPages = catchAsync(async (req, res) => {
    var condition = { $and: [{ isDelete: 1 }] };

    if (req.user?.type == 'user' || req.user?.type == 'partner') {
        condition.$and.push({ status: 1 })
    }

    if (req.query?.type) {
        condition.$and.push({
            $or: [{
                type: req.query?.type
            }]
        });
    }

    const result = await StaticContentModel.find(condition).sort({ createdAt: -1 });

    res.send({ data: result, code: CONSTANT.SUCCESSFUL, message: 'Static Page List' });
});

const getStaticPage = catchAsync(async (req, res) => {
    var data = {};
    if (req.params && req.params.pageId) {
        if (mongoose.Types.ObjectId.isValid(req.params.pageId)) {
            data = await StaticContentModel.findById(req.params.pageId);
        } else {
            data = await StaticContentModel.findOne({ slug: req.params.pageId });
        }
    }
    if (req.params && req.params.type && req.params.for) {
        data = await StaticContentModel.findOne({
            $and: [
                {
                    $or: [
                        { type: req.params.type },
                        { slug: req.params.type }
                    ]
                },
                { for: req.params.for } // Ensure that `for` matches the passed param
            ]
        });
    }
    if (!data) {
        res.send({ data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    } else {
        res.send({ data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.DETAILS });
    }
});

const updateStaticPage = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findOne({
        $or: [
            { type: req.params.type },
            { slug: req.params.type }
        ]
    });
    if (!data) {
        return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT };
    }
    Object.assign(data, req.body);
    await data.save();
    res.send({ data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.UPDATED });
});

const updateStaticPageByID = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findById(req.params.pageId);
    if (!data) {
        console.log('staticAdminEdit: ', data);

        res.send({ data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    }
    Object.assign(data, req.body);
    await data.save();
    // await Notification.ChangeStaticContentByAdmin(data.pageTitle);
    res.send({ data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.UPDATED });
});

const createStaticPages = catchAsync(async (req, res) => {
    const static = await StaticContentModel.create(req.body);
    res.send({ data: static, code: CONSTANT.SUCCESSFUL, message: CONSTANT.CREATED });
});
const deleteStaticPageById = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findById(req.params.pageId);

    if (!data) {
        return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT };
    }
    data.isDelete = 0;
    await data.save();
    res.send({ data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED });
});

const addAdminStaticPages = catchAsync(async (req, res) => {
    var condition = {
        $and: [{ _id: req.query.ids, isDelete: 1, status: 1 }],
    };

    const data = await StaticContentModel.find(condition);
    if (!data) {
        return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT };
    }

    return { data: data, code: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED };
});

module.exports = {
    getStaticPages,
    getStaticPage,
    updateStaticPage,
    updateStaticPageByID,
    createStaticPages,
    deleteStaticPageById,
    addAdminStaticPages,
};