const mongoose = require("mongoose");
const { toJSON } = require("./plugins");
const mongoosePaginate = require('mongoose-paginate-v2');

const contactUsSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "in_progress", "resolved", "rejected", "closed"],
    default: "pending",
  },
  isDelete: { type: Number, default: 1 }, // 0 is delete, 1 is Active
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  replies: [
    {
      responder: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // User/Partner or Admin
      sender: { type: String, enum: ["user", "partner", "admin"], required: true }, // Sender type
      message: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: true,
});

contactUsSchema.set('toObject', { virtuals: true });
contactUsSchema.set('toJSON', { virtuals: true });

// add plugin that converts mongoose to json
contactUsSchema.plugin(toJSON);
contactUsSchema.plugin(mongoosePaginate);

const CONTACT = mongoose.model("contact_us", contactUsSchema);

module.exports = CONTACT;
