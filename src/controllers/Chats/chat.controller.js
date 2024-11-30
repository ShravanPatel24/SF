const Chat = require("../../models/Chats/chat.model");

const getUserChatList = async (req, res) => {
    try {
        const { userId } = req.params; // Logged-in user ID

        const chats = await Chat.find({ participants: userId })
            .populate("lastMessage")
            .populate("participants", "username avatar email")
            .sort({ updatedAt: -1 })
            .lean();

        const chatList = chats.map((chat) => ({
            roomId: chat._id, // Chat ID (room ID)
            participants: chat.participants.filter((p) => p._id.toString() !== userId), // Exclude current user
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt,
        }));

        return res.status(200).json({
            statusCode: 200,
            message: "Chat list retrieved successfully",
            data: chatList,
        });
    } catch (error) {
        console.error("Error fetching chat list:", error.message);
        return res.status(500).json({
            statusCode: 500,
            message: "Error fetching chat list",
        });
    }
};

module.exports = { getUserChatList };