const express = require('express');
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { ChatController } = require("../../../controllers")
const { MessageController } = require("../../../controllers")
const router = express.Router();


router.get("/messages/:roomId", MessageController.getRoomMessages);
router.get("/chats/:userId", ChatController.getUserChatList);
// API for uploading attachments
router.post("/attachments/upload", upload.array("attachments"), MessageController.uploadAttachment);

module.exports = router;