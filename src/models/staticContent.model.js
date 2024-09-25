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
    for: { type: Number, default: 0 }, // 0 for user, and 1 for vendor(Partner), 2 For Both
    status: { type: Number, default: 1 }, // 1 is Open, 0 is completed
    isDelete: { type: Number, default: 1 }, // 0 is delete, 1 is Active
  },
  {
    timestamps: true
  }
);

staticPageSchema.set('toObject', { virtuals: true });
staticPageSchema.set('toJSON', { virtuals: true });

// Add plugin that converts mongoose to JSON
staticPageSchema.plugin(toJSON);
staticPageSchema.plugin(mongoosePaginate);

const STATICPAGE = mongoose.model('static_pages', staticPageSchema);

async function inIt() {
  const pagesToCreate = [
    {
      type: 'privacy',
      pageTitle: 'Privacy Policy',
      description: 'Put here your Privacy Policy',
      for: 0, // New key added
    },
    {
      type: 'terms',
      pageTitle: 'Terms & Conditions',
      description: 'Put here your Terms & Conditions',
      for: 0, // New key added
    },
    {
      type: 'shipping-policy',
      pageTitle: 'Shipping Policy',
      description: 'Put here your Shipping Policy',
      for: 0, // New key added
    },
    {
      type: 'refund-policy',
      pageTitle: 'Refund Policy',
      description: 'Put here your Refund Policy',
      for: 0, // New key added
    },
    {
      type: 'about-us',
      pageTitle: 'About Us',
      description: 'Learn more about us. Put here your About Us content',
      for: 2, // Only one entry with `for: 2`
    }
  ];

  const count = await STATICPAGE.countDocuments({});
  console.log("🚀 ~ file: staticContent.model.js:67 ~ inIt ~ count:", count)
  if (count === 0) {
    for (let i = 0; i < pagesToCreate.length; i++) {
      const element = pagesToCreate[i];

      // Append additional text to the description based on type and title
      element.description = `${element.description}. This is the ${element.pageTitle} section for ${element.for === 0 ? 'User' : 'Partner'}.`; 

      // For `for: 2` (About Us), create only one entry
      if (element.for === 2) {
        await new STATICPAGE(element).save(); // Save only one entry
      } else {
        // Save two entries for other types: one with `for: 0` and one with `for: 1`
        await new STATICPAGE(element).save();

        const elementWithFor1 = { ...element, for: 1 }; // Duplicate with `for: 1`
        await new STATICPAGE(elementWithFor1).save(); // Save the second entry
      }
    }
  }
}

inIt();


module.exports = STATICPAGE;
