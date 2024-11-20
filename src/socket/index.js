const { ChatEventEnum } = require("../config/constant.js");
const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");
const { Chat } = require("../models/Chats/chat.model");
const { ChatMessage } = require("../models/Chats/message.model");

/**
 * @description Initialize WebSocket events
 * @param {import("socket.io").Server} io
 */
const initializeSocketIO = (io) => {
  io.on("connection", async (socket) => {
    console.log("WebSocket connected:", socket.id);

    try {
      // Parse token from handshake
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.error("No token provided");
        return socket.disconnect();
      }

      // Verify token and get user details
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded?._id).select(
        "-password -refreshToken -emailVerificationToken"
      );

      if (!user) {
        console.error("Invalid token");
        return socket.disconnect();
      }

      // Attach user to socket
      socket.user = user;

      // Join user-specific room
      socket.join(user._id.toString());
      console.log(`User ${user._id} joined room`);

      // Notify frontend that the connection is established
      socket.emit(ChatEventEnum.CONNECTED_EVENT, {
        message: "Connected to WebSocket server",
      });

      /**
       * Handle `messageSent` event
       * @param {object} messageData - { chatId, content, attachments }
       */
      socket.on(ChatEventEnum.MESSAGE_SENT_EVENT, async (messageData) => {
        const { chatId, content, attachments } = messageData;

        // Save the message to the database
        const message = await ChatMessage.create({
          chat: chatId,
          sender: user._id,
          content,
          attachments,
        });

        // Update the chat's last message
        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

        // Emit the message to the chat room
        io.to(chatId).emit(ChatEventEnum.MESSAGE_RECEIVED_EVENT, {
          message,
        });
      });

      /**
       * Handle `joinChat` event
       */
      socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (data) => {
        const { chatId } = data;

        // Join the chat room
        socket.join(chatId);
        console.log(`User ${user._id} joined chat room ${chatId}`);
      });

      /**
       * Handle `typing` event
       */
      socket.on(ChatEventEnum.TYPING_EVENT, (data) => {
        const { chatId } = data;

        // Notify all other users in the chat that this user is typing
        socket.to(chatId).emit(ChatEventEnum.TYPING_EVENT, {
          userId: user._id,
        });
      });

      /**
       * Handle `stopTyping` event
       */
      socket.on(ChatEventEnum.STOP_TYPING_EVENT, (data) => {
        const { chatId } = data;

        // Notify all other users in the chat that this user stopped typing
        socket.to(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, {
          userId: user._id,
        });
      });

      /**
       * Handle disconnect event
       */
      socket.on("disconnect", () => {
        console.log(`User ${user._id} disconnected`);
      });
    } catch (error) {
      console.error("WebSocket connection error:", error.message);
      socket.disconnect();
    }
  });
};

module.exports = { initializeSocketIO };
