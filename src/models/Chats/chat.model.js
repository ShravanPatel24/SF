const mongoose = require("mongoose");
const { Schema } = mongoose;

const chatSchema = new Schema(
  {
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "user", // Reference to the User model
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage", // Reference to the last message in the chat
    },
    groupName: {
      type: String,
      required: function () {
        return this.isGroupChat;
      },
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "user", // The admin of the group (if group chat)
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

module.exports = mongoose.model("Chat", chatSchema);