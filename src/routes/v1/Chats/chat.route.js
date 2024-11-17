const express = require("express");
const verifyJWT = require("../../../middlewares/verifyJWT");
const {
    addNewParticipantInGroupChat,
    createAGroupChat,
    createOrGetAOneOnOneChat,
    deleteGroupChat,
    deleteOneOnOneChat,
    getAllChats,
    getGroupChatDetails,
    leaveGroupChat,
    removeParticipantFromGroupChat,
    renameGroupChat,
    searchAvailableUsers,
} = require("../../../controllers/Chats/chat.controller.js");
const {
    createAGroupChatValidator,
    updateGroupChatNameValidator,
} = require("../../../validations/Chats/chat.validation.js");
const { mongoIdPathVariableValidator } = require("../../../validations/Common/mongodb.validation.js");

const router = express.Router();

router.use(verifyJWT);

router.route("/").get(getAllChats);

router.route("/users").get(searchAvailableUsers);

router
    .route("/c/:receiverId")
    .post(
        mongoIdPathVariableValidator("receiverId"),
        createOrGetAOneOnOneChat
    );

router
    .route("/group")
    .post(createAGroupChatValidator(), createAGroupChat);

router
    .route("/group/:chatId")
    .get(mongoIdPathVariableValidator("chatId"), getGroupChatDetails)
    .patch(
        mongoIdPathVariableValidator("chatId"),
        updateGroupChatNameValidator(),
        renameGroupChat
    )
    .delete(mongoIdPathVariableValidator("chatId"), deleteGroupChat);

router
    .route("/group/:chatId/:participantId")
    .post(
        mongoIdPathVariableValidator("chatId"),
        mongoIdPathVariableValidator("participantId"),
        addNewParticipantInGroupChat
    )
    .delete(
        mongoIdPathVariableValidator("chatId"),
        mongoIdPathVariableValidator("participantId"),
        removeParticipantFromGroupChat
    );

router
    .route("/leave/group/:chatId")
    .delete(mongoIdPathVariableValidator("chatId"), leaveGroupChat);

router
    .route("/remove/:chatId")
    .delete(mongoIdPathVariableValidator("chatId"), deleteOneOnOneChat);

module.exports = router;