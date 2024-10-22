const catchAsync = require('../utils/catchAsync');
const { StaticContentModel } = require('../models');
const CONSTANT = require('../config/constant');
const mongoose = require('mongoose');

// Get static pages for guests
const getStaticPages = catchAsync(async (req, res) => {
    const condition = { $and: [{ isDelete: 1, status: 1 }] }; // Allow guest access
    const result = await StaticContentModel.find(condition).sort({ createdAt: -1 });
    res.send({ data: result, statusCode: CONSTANT.SUCCESSFUL, message: 'Static Page List' });
});

// Get a specific static page for guests
const getStaticPage = catchAsync(async (req, res) => {
    let data = {};
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
        res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    } else {
        res.send({ data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DETAILS });
    }
});

// Update static page by type
const updateStaticPage = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findOne({
        $or: [
            { type: req.params.type },
            { slug: req.params.type }
        ]
    });
    if (!data) {
        return res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    }
    Object.assign(data, req.body);
    await data.save();
    res.send({ data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.UPDATED });
});

// Update static page by ID
const updateStaticPageByID = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findById(req.params.pageId);
    if (!data) {
        console.log('staticAdminEdit: ', data);
        return res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    }
    Object.assign(data, req.body);
    await data.save();
    res.send({ data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.UPDATED });
});

// Create static pages
const createStaticPages = catchAsync(async (req, res) => {
    const static = await StaticContentModel.create(req.body);
    res.send({ data: static, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CREATED });
});

// Delete static page by ID
const deleteStaticPageById = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findById(req.params.pageId);
    if (!data) {
        return res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    }
    data.isDelete = 0;
    await data.save();
    res.send({ data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED });
});

// Add admin static pages
const addAdminStaticPages = catchAsync(async (req, res) => {
    const condition = {
        $and: [{ _id: req.query.ids, isDelete: 1, status: 1 }],
    };
    const data = await StaticContentModel.find(condition);
    if (!data) {
        return res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUNT });
    }
    return res.send({ data: data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED });
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