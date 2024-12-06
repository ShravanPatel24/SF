const express = require('express');
const { adminAuth, userAuth } = require('../../middlewares');
const validate = require('../../middlewares/validate');
const { contactValidation } = require('../../validations');
const { ContactUsController } = require('../../controllers');

const router = express.Router();

router.get('/list', adminAuth(), ContactUsController.getChatList);

router.get('/:contactId/conversation', adminAuth(), ContactUsController.getConversation);

router
    .route('/')
    .post(userAuth('createContact'), validate(contactValidation.createContact), ContactUsController.createContact)
    .get(userAuth('getContacts'), validate(contactValidation.getContacts), ContactUsController.getContacts);

router
    .route('/:contactId')
    .get(userAuth('getContact'), validate(contactValidation.getContact), ContactUsController.getContact)
    .patch(adminAuth('updateContact'), validate(contactValidation.updateContact), ContactUsController.updateContact)
    .delete(adminAuth('deleteContact'), validate(contactValidation.deleteContact), ContactUsController.deleteContact);

router
    .route('/:contactId/reply')
    .post(adminAuth('replyToContact'), validate(contactValidation.replyToContact), ContactUsController.replyToContact);

router.patch('/:contactId/status', adminAuth(), validate(contactValidation.updateStatus), ContactUsController.updateQueryStatus);

/**
 * User/Partner Routes (Prefixed)
 */
// Fetch user's/partner's conversation with admin
router.get(
    '/user/:contactId/conversation',
    userAuth(),
    ContactUsController.getConversationForUserOrPartner
);

// Allow user/partner to reply to admin
router.post(
    '/user/:contactId/reply',
    userAuth(),
    validate(contactValidation.replyToContact),
    ContactUsController.replyToAdmin
);

module.exports = router;