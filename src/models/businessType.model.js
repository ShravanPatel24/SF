const mongoose = require("mongoose");
var Schema = mongoose.Schema;
const { toJSON } = require("./plugins");
const mongoosePaginate = require("mongoose-paginate-v2");

const businessTypeSchema = new Schema({
  name: { type: String, required: true },
  isProduct: { type: Boolean, default: false },
  status: { type: Number, default: 1 }, //0 is Inactive, 1 is Active
  isDelete: { type: Number, default: 1 }, //0 is delete, 1 is Active
},
  {
    timestamps: true,
  }
);

businessTypeSchema.set("toObject", { virtuals: true });
businessTypeSchema.set("toJSON", { virtuals: true });

// add plugin that converts mongoose to json
businessTypeSchema.plugin(toJSON);
businessTypeSchema.plugin(mongoosePaginate);

businessTypeSchema.statics.isFieldValueTaken = async function (fieldName, value, excludeId) {
  const query = { [fieldName]: value };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const data = await this.findOne(query);
  return !!data;
};

const BUSINESSTYPE = mongoose.model("businessType", businessTypeSchema);

async function inIt() {
  const count = await BUSINESSTYPE.countDocuments({});

  // If no records exist, insert multiple records
  if (count === 0) {
    const businessTypes = [
      { name: "Restaurant and Cafe", isProduct: true },
      { name: "Hotels", isProduct: true },
      { name: "Entertainments", isProduct: false },
      { name: "Companies", isProduct: false },
      { name: "Transportation", isProduct: false },
      { name: "Markets and Shopping", isProduct: false },
      // { name: "Others" }
    ];

    await BUSINESSTYPE.insertMany(businessTypes);
  } 
}

inIt();

module.exports = BUSINESSTYPE;

