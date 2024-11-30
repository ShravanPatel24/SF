const express = require('express');
const { getRoomMessages } = require('../../../controllers/Chats/message.controller');
const { getUserChatList } = require('../../../controllers/Chats/chat.controller');
const router = express.Router();

router.get("/messages/:roomId", getRoomMessages);
router.get("/chats/:userId", getUserChatList);

module.exports = router;