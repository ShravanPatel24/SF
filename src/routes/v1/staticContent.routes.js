const express = require('express');
const { basicAuth, adminAuth } = require('../../middlewares');
const { StaticContentController } = require('../../controllers');

const router = express.Router();

// Routes for guest users
router
    .route('/guest/for/user')
    .get(StaticContentController.getStaticPages); // Allow guests to get static pages

router
    .route('/guest/for-user/:for/:type')
    .get(StaticContentController.getStaticPage); // Allow guests to get a specific static page

router
    .route('/guest/using-pageId/:pageId')
    .get(StaticContentController.getStaticPage); // Allow guests to get a specific static page by ID

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