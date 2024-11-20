const { VariantsModel } = require('../models');

// Create a variant
const createVariant = async (requestBody) => {
    const variant = await VariantsModel.create(requestBody);
    return { data: variant, message: 'Variant created successfully.' };
};

// Get all variants
const getVariants = async (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Base condition
    const condition = { isDelete: 1 };

    // Add search by variantName or color
    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i'); // Case-insensitive search
        condition.$or = [
            { variantName: searchRegex },
            { color: searchRegex },
            { size: searchRegex }
        ];
    }

    // Filter by status
    if (query.status) {
        condition.status = parseInt(query.status, 10); // Filter on status field
    }

    // Sorting
    const sort = {};
    if (query.sortBy) {
        const [field, order] = query.sortBy.split(':');
        sort[field] = order === 'desc' ? -1 : 1; // Sort by field in asc/desc order
    }

    // Fetch filtered, sorted, and paginated results
    const [docs, totalDocs] = await Promise.all([
        VariantsModel.find(condition).sort(sort).skip(skip).limit(limit),
        VariantsModel.countDocuments(condition)
    ]);

    const totalPages = Math.ceil(totalDocs / limit);

    return {
        docs,
        totalDocs,
        limit,
        totalPages,
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null
    };
};

// Get variants for partner
const getVariantsForPartner = async (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Base condition: Fetch only active variants
    const condition = { isDelete: 1, status: 1 }; // Fetch active and non-deleted variants

    // Add search functionality (if provided)
    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i'); // Case-insensitive search
        condition.$or = [
            { variantName: searchRegex },
            { color: searchRegex },
            { size: searchRegex }
        ];
    }

    // Sorting
    const sort = {};
    if (query.sortBy) {
        const [field, order] = query.sortBy.split(':');
        sort[field] = order === 'desc' ? -1 : 1; // Sort by field in asc/desc order
    }

    // Fetch filtered, sorted, and paginated results
    const [docs, totalDocs] = await Promise.all([
        VariantsModel.find(condition).sort(sort).skip(skip).limit(limit),
        VariantsModel.countDocuments(condition)
    ]);

    const totalPages = Math.ceil(totalDocs / limit);

    return {
        docs,
        totalDocs,
        limit,
        totalPages,
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null
    };
};

// Get a variant by ID
const getVariantById = async (id) => {
    const variant = await VariantsModel.findById(id);
    if (!variant) throw new Error('Variant not found.');
    return variant;
};

// Update a variant by ID
const updateVariantById = async (id, updateBody) => {
    const variant = await VariantsModel.findById(id);
    if (!variant) throw new Error('Variant not found.');
    Object.assign(variant, updateBody);
    await variant.save();
    return { data: variant, message: 'Variant updated successfully.' };
};

// Delete a variant by ID (soft delete)
const deleteVariantById = async (id) => {
    const variant = await VariantsModel.findById(id);
    if (!variant) throw new Error('Variant not found.');
    variant.isDelete = 0;
    await variant.save();
    return { data: variant, message: 'Variant deleted successfully.' };
};

module.exports = {
    createVariant,
    getVariants,
    getVariantsForPartner,
    getVariantById,
    updateVariantById,
    deleteVariantById
};