const { Server } = require("socket.io");
const { ChatEventEnum, AvailableChatEvents } = require("../config/constant.js");
const { User } = require("../models/user.model");
const { ApiError } = require("../utils/ApiError.js");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

/**
 * @description This function is responsible for setting up all events, including message status (sent, delivered, seen)
 * @param {Server} io - The socket.io server instance
 */
const initializeSocketIO = (io) => {
  return io.on("connection", async (socket) => {
    try {
      // Parse and verify the access token
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
      let token = cookies?.accessToken || socket.handshake.auth?.token;

      if (!token) throw new ApiError(401, "Token missing in handshake");

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
      );

      if (!user) throw new ApiError(401, "Unauthorized handshake. Invalid token");

      // Mount the user object and join user’s room
      socket.user = user;
      socket.join(user._id.toString());

      socket.emit(ChatEventEnum.CONNECTED_EVENT); // Notify the user is connected
      console.log("User connected . userId: ", user._id.toString());

      // Mount common events
      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      // *** New Message Status Events ***

      // When a message is sent, broadcast 'sent' to the sender
      socket.on(ChatEventEnum.MESSAGE_SENT_EVENT, (messageData) => {
        const { chatId, messageId, recipientId } = messageData;

        // Emit 'sent' status to the sender
        socket.emit(ChatEventEnum.MESSAGE_STATUS_UPDATE, {
          messageId,
          status: "sent",
        });

        // Broadcast 'delivered' when recipient joins or becomes online
        socket.to(recipientId).emit(ChatEventEnum.MESSAGE_STATUS_UPDATE, {
          messageId,
          status: "delivered",
        });
      });

      // When a message is seen, broadcast 'seen' to the sender
      socket.on(ChatEventEnum.MESSAGE_SEEN_EVENT, (messageData) => {
        const { chatId, messageId, recipientId } = messageData;

        // Emit 'seen' status to the sender
        socket.to(recipientId).emit(ChatEventEnum.MESSAGE_STATUS_UPDATE, {
          messageId,
          status: "seen",
        });
      });

      // Handle user disconnection
      socket.on(ChatEventEnum.DISCONNECT_EVENT, () => {
        console.log("User disconnected 🚫. userId: " + socket.user?._id);
        if (socket.user?._id) socket.leave(socket.user._id);
      });

    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "Connection error"
      );
    }
  });
};

/**
 * @description Utility function to emit socket events to a specific room.
 * @param {import("express").Request} req - The request object to access `io` instance
 * @param {string} roomId - The room ID where the event should be emitted
 * @param {AvailableChatEvents[0]} event - The event to emit
 * @param {any} payload - The data to send with the event
 */
const emitSocketEvent = (req, roomId, event, payload) => {
  const io = req.app.get("io");
  console.log("Socket.io instance:", io);

  if (!io) {
    throw new Error("Socket.io instance not initialized");
  }

  io.in(roomId).emit(event, payload);
};

module.exports = { initializeSocketIO, emitSocketEvent };