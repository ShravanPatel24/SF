const express = require('express');
const { basicAuth } = require('../../middlewares');
const { StaticContentController } = require('../../controllers');

const router = express.Router();

// Routes for guest users
router
    .route('/guest/pages')
    .get(StaticContentController.getStaticPages); // Allow guests to get the list of static pages

router
    .route('/guest/page/:pageId')
    .get(StaticContentController.getStaticPage); // Allow guests to get a specific static page by ID or slug

// Routes for authenticated users (admins, partners, and users)
router
    .route('/pages')
    .get(basicAuth('getStaticPages'), StaticContentController.getStaticPages); // Authenticated users get all pages

router
    .route('/page/:pageId')
    .get(basicAuth('getStaticPage'), StaticContentController.getStaticPage) // Authenticated users get a specific page
    .patch(basicAuth('updateStaticPage'), StaticContentController.updateStaticPage); // Authenticated users update a static page

router
    .route('/page-by-slug/:type')
    .patch(basicAuth('updateStaticPage'), StaticContentController.updateStaticPage); // Update static page by slug

module.exports = router;