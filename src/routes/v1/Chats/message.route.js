const express = require("express");
const {
    deleteMessage,
    getAllMessages,
    sendMessage,
} = require("../../../controllers/Chats/message.controller.js");
const verifyJWT = require("../../../middlewares/verifyJWT");
const { upload } = require("../../../middlewares/multer.js");
const { sendMessageValidator } = require("../../../validations/Chats/message.validation.js");
const { mongoIdPathVariableValidator } = require("../../../validations/Common/mongodb.validation.js");

const router = express.Router();

router.use(verifyJWT);

router
    .route("/:chatId")
    .get(mongoIdPathVariableValidator("chatId"), getAllMessages)
    .post(
        upload.fields([{ name: "attachments", maxCount: 5 }]),
        mongoIdPathVariableValidator("chatId"),
        sendMessageValidator(),
        sendMessage
    );

router
    .route("/:chatId/:messageId")
    .delete(
        mongoIdPathVariableValidator("chatId"),
        mongoIdPathVariableValidator("messageId"),
        deleteMessage
    );

module.exports = router;