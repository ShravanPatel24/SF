const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const mongoosePaginate = require('mongoose-paginate-v2');
const slug = require('mongoose-slug-updater');

mongoose.plugin(slug);

const staticPageSchema = mongoose.Schema(
  {
    type: String,
    pageTitle: String,
    slug: { type: String, slug: "pageTitle", unique: true },
    description: String,
    status: { type: Number, default: 1 }, // 1 is Open, 0 is completed
    isDelete: { type: Number, default: 1 }, // 0 is delete, 1 is Active
  },
  {
    timestamps: true,
  }
);

staticPageSchema.set('toObject', { virtuals: true });
staticPageSchema.set('toJSON', { virtuals: true });

// Add plugins that convert mongoose to JSON and paginate results
staticPageSchema.plugin(toJSON);
staticPageSchema.plugin(mongoosePaginate);

const STATICPAGE = mongoose.model('static_pages', staticPageSchema);

module.exports = STATICPAGE;