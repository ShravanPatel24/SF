const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");
const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    content: {
      type: String,
      default: "", // Text message content
    },
    attachments: {
      type: [
        {
          url: String, // Public URL of the attachment
          localPath: String, // Local file path (optional for reference)
          type: {
            type: String,
            enum: ["image", "video", "document", "audio"], // Attachment type
            required: true,
          },
        },
      ],
      default: [],
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
  },
  { timestamps: true }
);

chatMessageSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
