const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const socket = require("socket.io");

let server;
console.log('config.env===>>', config.env, config.mongoose);

const db_url = config.env === "production"
  ? `mongodb://${encodeURIComponent(config.mongoose.user)}:${encodeURIComponent(config.mongoose.pass)}@${config.mongoose.ip}/CricketLiveOddsLineDB?authSource=admin`
  : config.mongoose.url;

const port = config.port;

mongoose.connect(db_url).then(() => {
  logger.info('Connected to MongoDB');
  server = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });

  // Initialize Socket.IO
  const io = socket(server, {
    cors: {
      origin: "http://localhost:3000", // Allow frontend origin
      methods: ["GET", "POST"],
      credentials: true, // Allow credentials like cookies/auth headers
    },
    transports: ["websocket", "polling"], // Ensure WebSocket support
  });

  global.onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
    global.chatSocket = socket;

    socket.on("add-user", (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on("send-msg", (data) => {
      const sendUserSocket = onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-recieve", data.msg);
      } else {
        console.log(`User ${data.to} is not online`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

}).catch(err => {
  logger.error(`MongoDB connection error: ${err.message}`);
});

// Handle server exit gracefully
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.error(error);
  exitHandler();
});

process.on('unhandledRejection', (error) => {
  logger.error(error);
  exitHandler();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});