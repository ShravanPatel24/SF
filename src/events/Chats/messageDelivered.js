const mongoose = require("mongoose");
const ChatMessage = require("../../models/Chats/message.model");

const handleMessageDelivered = async (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing message-delivered rawData:", error.message);
        return;
    }

    const messageId = parsedData?.data?.messageId;
    const to = parsedData?.data?.to;

    if (!messageId || !to) {
        console.log("Missing fields in message-delivered event:", { messageId, to });
        return;
    }

    console.log(`Message ${messageId} delivered to ${to}`);

    try {
        // Check if messageId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            console.log(`Invalid ObjectId: ${messageId}`);
            return;
        }

        const message = await ChatMessage.findByIdAndUpdate(
            messageId,
            { status: "delivered" },
            { new: true }
        );

        if (!message) {
            console.log(`Message with ID ${messageId} not found.`);
            return;
        }

        console.log(`Message ${messageId} status updated to delivered.`);

        // Notify the recipient about the message delivery
        const recipientSocket = onlineUsers.get(to);
        if (recipientSocket) {
            socket.to(recipientSocket).emit("message-delivered", { messageId });
            console.log(`Delivery notification sent to ${to}`);
        } else {
            console.log(`Recipient ${to} is not online.`);
        }
    } catch (error) {
        console.error("Error updating message status:", error.message);
    }
};

module.exports = handleMessageDelivered;