const ChatMessage = require("../../models/Chats/message.model");

const handleMessageSeen = async (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing message-seen rawData:", error.message);
        return;
    }

    const messageId = parsedData?.data?.messageId;
    const to = parsedData?.data?.to;

    if (!messageId || !to) {
        console.log("Missing fields in message-seen event:", { messageId, to });
        return;
    }

    console.log(`Message ${messageId} seen by ${to}`);

    try {
        const message = await ChatMessage.findByIdAndUpdate(
            messageId,
            { status: "seen" },
            { new: true }
        );

        if (!message) {
            console.log(`Message with ID ${messageId} not found.`);
            return;
        }

        console.log(`Message ${messageId} status updated to seen.`);
    } catch (error) {
        console.error("Error updating message status:", error.message);
    }
};

module.exports = handleMessageSeen;