const ChatMessage = require("../../models/Chats/message.model");

const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params; // Room ID

        const messages = await ChatMessage.find({ chat: roomId })
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

module.exports = { getRoomMessages };