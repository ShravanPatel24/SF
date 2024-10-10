const express = require('express');
const { basicAuth, adminAuth } = require('../../middlewares');
const { StaticContentController } = require('../../controllers');

const router = express.Router();

router
    .route('/for/user')
    .get(basicAuth('getStaticPages'), StaticContentController.getStaticPages);

router
    .route('/for/admin')
    .get(adminAuth('getStaticPages'), StaticContentController.getStaticPages);

router
    .route('/for-user/:for/:type')
    .get(basicAuth('getStaticPage'), StaticContentController.getStaticPage)

router
    .route('/using-pageId/:pageId')
    .get(basicAuth('getStaticPage'), StaticContentController.getStaticPage)
    .patch(adminAuth('updateStaticPageByID'), StaticContentController.updateStaticPageByID);

router
    .route('/page/:for/:type')
    .get(adminAuth('getStaticPages'), StaticContentController.getStaticPage)
    .patch(adminAuth('updateStaticPage'), StaticContentController.updateStaticPage);

module.exports = router;