const { ChatModel, MessageModel } = require("../../models");
const { s3Service } = require('../../services');

const uploadAttachment = async (req, res) => {
    try {
        const { chatId, sender, messageId } = req.body;

        if (!chatId || !sender || !req.files || req.files.length === 0) {
            return res.status(400).json({
                statusCode: 400,
                message: "Missing required fields (chatId, sender, or attachments).",
            });
        }

        // Upload files to S3
        const folderName = `chat_attachments/${chatId}`;
        const s3UploadResults = await s3Service.uploadDocuments(req.files, folderName);

        const newAttachments = s3UploadResults.map((file) => ({
            url: file.key,
            type: file.mimetype.startsWith("image") ? "image" :
                file.mimetype.startsWith("video") ? "video" :
                    file.mimetype.startsWith("audio") ? "audio" : "document",
        }));

        let chatMessage;

        // Check if `messageId` is provided to append to an existing message
        if (messageId) {
            chatMessage = await MessageModel.findByIdAndUpdate(
                messageId,
                { $push: { attachments: { $each: newAttachments } } },
                { new: true }
            );
            if (!chatMessage) {
                return res.status(404).json({
                    statusCode: 404,
                    message: "Message ID not found. Cannot append attachments.",
                });
            }
        } else {
            // Create a new message if `messageId` is not provided
            chatMessage = new MessageModel({
                chat: chatId,
                sender: sender,
                content: "",
                attachments: newAttachments,
            });
            await chatMessage.save();

            // Update the last message in the chat
            await ChatModel.findByIdAndUpdate(chatId, { lastMessage: chatMessage._id }, { new: true });
        }
        return res.status(201).json({
            statusCode: 201,
            message: messageId ? "Attachments added to existing message." : "Attachments uploaded successfully.",
            data: chatMessage,
        });
    } catch (error) {
        console.error("Error uploading attachments:", error.message);
        return res.status(500).json({
            statusCode: 500,
            message: "Error uploading attachments.",
        });
    }
};

const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params; // Room ID

        const messages = await MessageModel.find({ chat: roomId })
            .populate("sender", "username avatar email")
            .sort({ createdAt: 1 }) // Oldest to newest
            .lean();

        return res.status(200).json({
            statusCode: 200,
            message: "Messages retrieved successfully",
            data: messages,
        });
    } catch (error) {
        console.error("Error fetching room messages:", error.message);
        return res.status(500).json({
            statusCode: 500,
            message: "Error fetching messages",
        });
    }
};

module.exports = { getRoomMessages, uploadAttachment };