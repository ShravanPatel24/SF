const express = require('express');
const userRoute = require('./user.routes');
const businessTypeRoute = require('./businessType.route');
const MediaRoute = require('./media.route');
const PostRoute = require('./posts.route')
const businessRoute = require('./business.routes');
const bankRoute = require('./bank.route');
const itemsRoute = require('./item.routes');
const itemCategoryRoute = require('./itemCategory.route');
const dineOutRoute = require('./dineOut.routes');
const cartRoute = require('./cart.routes')
const orderRoute = require('./order.route')
const templateRoute = require('./template.route')
const AddressRoute = require('./address.route')
const VariantsRoute = require('./variants.route')
const InvoiceRoute = require('./invoice.route')
const ChatRoute = require('./Chats/chat.route')

const AdminAuthRoute = require("./admin/auth.route");
const AdminStaffRoute = require("./admin/adminStaff.route");
const AdminRoleRoute = require("./admin/adminRole.route");
const AdminUserRoute = require('./admin/adminUser.route');
const DashboardRoute = require('./dashboard.routes');
const AdminSettingRoute = require('./admin/adminSettings.route');

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
  { path: "/admin/roles", route: AdminRoleRoute },
  { path: "/admin/staff", route: AdminStaffRoute },
  { path: "/admin/settings", route: AdminSettingRoute },
  { path: '/variants', route: VariantsRoute },
  { path: "/contact-us", route: ContactUsRoute },
  { path: "/faq", route: FAQRoute },
  { path: '/static-content', route: StaticContentRoute },
  { path: '/business-type', route: businessTypeRoute },
  { path: '/business', route: businessRoute },
  { path: '/bank', route: bankRoute },
  { path: '/items', route: itemsRoute },
  { path: '/item-category', route: itemCategoryRoute },
  { path: '/dine-out', route: dineOutRoute },
  { path: '/cart', route: cartRoute },
  { path: '/order', route: orderRoute },
  { path: '/posts', route: PostRoute },
  { path: '/templates', route: templateRoute },
  { path: '/address', route: AddressRoute },
  { path: '/invoice', route: InvoiceRoute },
  { path: '/chat-message', route: ChatRoute },
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