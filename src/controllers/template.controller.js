const pick = require('../utils/pick');
const catchAsync = require('../utils/catchAsync');
const { TemplateService } = require('../services');
const CONSTANTS = require('../config/constant');

const createTemplate = catchAsync(async (req, res) => {
    req.body.adminId = req.user._id;
    const result = await TemplateService.createTemplate(req.body);

    res.status(result.statusCode).send({
        statusCode: result.statusCode,
        data: result.data,
        message: result.message,
    });
});

const getTemplates = catchAsync(async (req, res) => {
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'search', 'loanApplicationId', 'templateType', 'status']);
    options['adminId'] = req.user._id;

    const result = await TemplateService.queryTemplate(options);
    res.status(200).send({
        statusCode: 200,
        data: result,
        message: CONSTANTS.TEMPLATE_LIST
    });
});

const getTemplate = catchAsync(async (req, res) => {
    const result = await TemplateService.getTemplateById(req.params.templateId);
    if (!result.data) {
        return res.status(404).send({
            statusCode: 404,
            data: {},
            message: CONSTANTS.TEMPLATE_NOT_FOUND
        });
    }
    res.status(200).send({
        statusCode: 200,
        data: result.data,
        message: CONSTANTS.TEMPLATE_DETAILS
    });
});

const updateTemplate = catchAsync(async (req, res) => {
    const result = await TemplateService.updateTemplateById(req.params.templateId, req.body);
    if (result.statusCode === 404) {
        return res.status(404).send(result);
    }
    res.status(200).send(result);
});

const deleteTemplate = catchAsync(async (req, res) => {
    const result = await TemplateService.deleteTemplateById(req.params.templateId);
    res.status(result.statusCode).send(result);
});

const getTemplatesWithoutPagination = catchAsync(async (req, res) => {
    const options = pick(req.query, ['searchBy']);
    const result = await TemplateService.queryTemplateWithoutPagination(options);
    res.status(200).send({
        statusCode: 200,
        data: result,
        message: CONSTANTS.TEMPLATE_LIST
    });
});

module.exports = {
    createTemplate,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesWithoutPagination
};