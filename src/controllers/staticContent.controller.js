const catchAsync = require('../utils/catchAsync');
const { StaticContentModel } = require('../models');
const CONSTANT = require('../config/constant');
const mongoose = require('mongoose');

// Get all static pages
const getStaticPages = catchAsync(async (req, res) => {
    const { slug, status, search, page = 1, limit = 10 } = req.query;

    // Build dynamic filter
    const condition = { isDelete: 1 }; // Only include non-deleted items

    if (slug) {
        condition.slug = slug; // Filter by slug
    }

    if (status) {
        condition.status = parseInt(status); // Filter by status
    }

    if (search) {
        condition.$or = [
            { pageTitle: { $regex: search, $options: 'i' } }, // Case-insensitive search in title
            { description: { $regex: search, $options: 'i' } }, // Case-insensitive search in description
        ];
    }

    // Use Mongoose pagination
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }, // Sort by creation date (newest first)
        lean: true, // Return plain JavaScript objects instead of Mongoose documents
    };

    const result = await StaticContentModel.paginate(condition, options);

    // Format the response to match your desired structure
    const response = {
        statusCode: CONSTANT.SUCCESSFUL,
        message: 'Static Page List.',
        data: {
            docs: result.docs, // The paginated results
            totalDocs: result.totalDocs, // Total number of documents
            limit: result.limit, // Items per page
            totalPages: result.totalPages, // Total number of pages
            page: result.page, // Current page
            pagingCounter: result.pagingCounter, // Counter for the first item on the page
            hasPrevPage: result.hasPrevPage, // Whether there is a previous page
            hasNextPage: result.hasNextPage, // Whether there is a next page
            prevPage: result.prevPage, // Previous page number (if any)
            nextPage: result.nextPage, // Next page number (if any)
        },
    };

    res.send(response);
});

// Get a specific static page by ID or slug
const getStaticPage = catchAsync(async (req, res) => {
    const pageId = req.params.pageId;
    let data;
    if (mongoose.Types.ObjectId.isValid(pageId)) {
        data = await StaticContentModel.findById(pageId);
    } else {
        data = await StaticContentModel.findOne({ slug: pageId });
    }
    if (!data) {
        return res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUND });
    }
    res.send({ data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DETAILS });
});

// Update static page by slug or ID
const updateStaticPage = catchAsync(async (req, res) => {
    const identifier = req.params.pageId || req.params.type;
    const data = await StaticContentModel.findOne({
        $or: [{ _id: identifier }, { slug: identifier }],
    });

    if (!data) {
        return res.send({
            data: {},
            statusCode: CONSTANT.NOT_FOUND,
            message: CONSTANT.NOTFOUND,
        });
    }

    // Update static content fields
    Object.assign(data, req.body);
    await data.save();

    // Check the `status` field to determine the message
    const message = data.status === 1
        ? CONSTANT.STATIC_ACTIVATED
        : CONSTANT.STATIC_INACTIVATED;

    res.send({
        data,
        statusCode: CONSTANT.SUCCESSFUL,
        message,
    });
});


// Create a new static page
const createStaticPages = catchAsync(async (req, res) => {
    const staticPage = await StaticContentModel.create(req.body);
    res.send({ data: staticPage, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.CREATED });
});

// Soft-delete a static page by ID
const deleteStaticPageById = catchAsync(async (req, res) => {
    const data = await StaticContentModel.findById(req.params.pageId);
    if (!data) {
        return res.send({ data: {}, statusCode: CONSTANT.NOT_FOUND, message: CONSTANT.NOTFOUND });
    }
    data.isDelete = 0;
    await data.save();
    res.send({ data, statusCode: CONSTANT.SUCCESSFUL, message: CONSTANT.DELETED });
});

module.exports = {
    getStaticPages,
    getStaticPage,
    updateStaticPage,
    createStaticPages,
    deleteStaticPageById,
};