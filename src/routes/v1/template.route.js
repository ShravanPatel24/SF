const express = require('express');
const { adminAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { TemplateValidation } = require('../../validations');
const { TemplateController } = require('../../controllers');
 
const router = express.Router();
 
router
    .route('/')
    .post(adminAuth('createTemplate'), validate(TemplateValidation.createTemplate), TemplateController.createTemplate)
    .get(adminAuth('getTemplates'), validate(TemplateValidation.getTemplates), TemplateController.getTemplates);
 
router
    .route('/:templateId')
    .get(adminAuth('getTemplate'), validate(TemplateValidation.getTemplate), TemplateController.getTemplate)
    .patch(adminAuth('updateTemplate'), TemplateController.updateTemplate)
    .delete(adminAuth('deleteTemplate'), validate(TemplateValidation.deleteTemplate), TemplateController.deleteTemplate);
 
router
    .route('/list/dropdown')
    .get(adminAuth('getTemplatesWithoutPagination'), TemplateController.getTemplatesWithoutPagination);
 
module.exports = router;