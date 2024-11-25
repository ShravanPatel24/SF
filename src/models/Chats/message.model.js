const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
