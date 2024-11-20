const mongoose = require("mongoose");
const http = require("http"); // HTTP server
const socket = require("socket.io"); // Socket.IO
const app = require("./app"); // Express app
const config = require("./config/config");
const logger = require("./config/logger");

// Import Chat event handlers
const handleAddUser = require("./events/Chats/addUser");
const handleSendMsg = require("./events/Chats/sendMsg");
const handleTyping = require("./events/Chats/typing");
const handleStopTyping = require("./events/Chats/stopTyping");
const handleMessageDelivered = require("./events/Chats/messageDelivered");
const handleMessageSeen = require("./events/Chats/messageSeen");
const handleNotifyUser = require("./events/Chats/notifyUser");
const handlePingPong = require("./events/Chats/pingPong");
const handleDisconnect = require("./events/Chats/disconnectEvent");

// Import Video/Audio calling event handlers
const createOffer = require("./events/VideoAudioCalling/createOffer");
const createAnswer = require("./events/VideoAudioCalling/createAnswer");
const sendIceCandidate = require("./events/VideoAudioCalling/sendIceCandidate");
const hangUp = require("./events/VideoAudioCalling/hangUp");

// Create HTTP server
const server = http.createServer(app);

const db_url =
  config.env === "production"
    ? `mongodb://${encodeURIComponent(config.mongoose.user)}:${encodeURIComponent(config.mongoose.pass)}@${config.mongoose.ip
    }/CricketLiveOddsLineDB?authSource=admin`
    : config.mongoose.url;

// Connect to MongoDB
mongoose
  .connect(db_url)
  .then(() => {
    logger.info("Connected to MongoDB");

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
    });

    // Initialize Socket.IO
    const io = socket(server, {
      cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });    

    // Global online users map
    global.onlineUsers = new Map();

    // Namespace for `/ws/connect`
    const chatNamespace = io.of("/ws/connect");

    chatNamespace.on("connection", (socket) => {
      console.log(`Client connected to /ws/connect: ${socket.id}`);

      // Register Chat event handlers
      socket.on("add-user", (data) => handleAddUser(socket, global.onlineUsers, data));
      socket.on("send-msg", (data) => handleSendMsg(socket, global.onlineUsers, data));
      socket.on("typing", (data) => handleTyping(socket, global.onlineUsers, data));
      socket.on("stop-typing", (data) => handleStopTyping(socket, global.onlineUsers, data));
      socket.on("message-delivered", (data) => handleMessageDelivered(socket, global.onlineUsers, data));
      socket.on("message-seen", (data) => handleMessageSeen(socket, global.onlineUsers, data));
      socket.on("notify-user", (data) => handleNotifyUser(socket, global.onlineUsers, data));
      handlePingPong(socket); // Ping-Pong is a listener, not an emitter

      // Register Video/Audio calling event handlers
      socket.on("createOffer", (data) => createOffer(socket, global.onlineUsers, data));
      socket.on("createAnswer", (data) => createAnswer(socket, global.onlineUsers, data));
      socket.on("sendIceCandidate", (data) => sendIceCandidate(socket, global.onlineUsers, data));
      socket.on("hangUp", (data) => hangUp(socket, global.onlineUsers, data));

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        handleDisconnect(socket, global.onlineUsers);
      });
    });
  })
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

// Graceful shutdown
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on("uncaughtException", (error) => {
  logger.error(error);
  exitHandler();
});

process.on("unhandledRejection", (error) => {
  logger.error(error);
  exitHandler();
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) {
    server.close();
  }
});