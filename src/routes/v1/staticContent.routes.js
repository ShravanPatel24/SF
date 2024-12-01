const express = require('express');
const { adminAuth, basicAuth } = require('../../middlewares');
const { StaticContentController } = require('../../controllers');

const router = express.Router();

// Routes for guest users
router
    .route('/guest/pages')
    .get(StaticContentController.getStaticPages); // Allow guests to get the list of static pages

router
    .route('/guest/page/:pageId')
    .get(StaticContentController.getStaticPage); // Allow guests to get a specific static page by ID or slug

// Routes for admin users
router
    .route('/pages')
    .get(adminAuth('getStaticPages'), StaticContentController.getStaticPages); // Admins get all pages

router
    .route('/page/:pageId')
    .get(adminAuth('getStaticPage'), StaticContentController.getStaticPage) // Admins get a specific page
    .patch(adminAuth('updateStaticPage'), StaticContentController.updateStaticPage); // Admins update a static page

router
    .route('/page-by-slug/:type')
    .patch(adminAuth('updateStaticPage'), StaticContentController.updateStaticPage); // Admins update static page by slug

// Combined Routes for User and Partner (Protected by Basic Auth)
router
    .route('/user-partner/pages')
    .get(basicAuth('getStaticPages'), StaticContentController.getStaticPages); // User and Partner retrieve all pages

router
    .route('/user-partner/page/:pageId')
    .get(basicAuth('getStaticPage'), StaticContentController.getStaticPage); // User and Partner retrieve a specific page

module.exports = router;