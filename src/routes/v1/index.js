const express = require('express');
const userRoute = require('./user.routes');
const businessTypeRoute = require('./businessType.route');
const MediaRoute = require('./media.route');
const PostRoute = require('./posts.route')
const businessRoute = require('./business.routes');
const itemsRoute = require('./item.routes');
const dineOutRoute = require('./dineOut.routes');

const AdminAuthRoute = require("./admin/auth.route");
const AdminRoleRoute = require("./admin/role.route");
const AdminUserRoute = require('./admin/adminUser.route');
const DashboardRoute = require('./dashboard.routes');
const AdminDashboardRoute = require('./admin/dashboard.route');

const ContactUsRoute = require('./contactUs.route');
const FAQRoute = require('./faq.route');
const StaticContentRoute = require('./staticContent.routes');

const docsRoute = require('./docs.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  { path: "/media", route: MediaRoute },
  { path: "/user", route: userRoute },
  { path: "/partner", route: userRoute },

  { path: '/admin/user', route: AdminUserRoute },
  { path: "/admin", route: AdminAuthRoute },
  { path: '/dashboard', route: DashboardRoute },
  { path: "/admin/dashboard", route: AdminDashboardRoute },
  { path: "/admin/roles", route: AdminRoleRoute },
  { path: "/contact-us", route: ContactUsRoute },
  { path: "/faq", route: FAQRoute },
  { path: '/static-content', route: StaticContentRoute },
  { path: '/business-type', route: businessTypeRoute },
  { path: '/business', route: businessRoute },
  { path: '/items', route: itemsRoute },
  { path: '/dine-out', route: dineOutRoute },

  { path: '/posts', route: PostRoute }
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
// if (config.env === 'development') {
devRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
// }

module.exports = router;

