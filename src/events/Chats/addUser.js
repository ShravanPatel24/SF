const Chat = require("../../models/Chats/chat.model");

const handleAddUser = async (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing add-user rawData:", error.message);
        return;
    }

    const userId = parsedData?.userId || parsedData?.data?.userId;

    if (!userId) {
        console.log("No userId provided in add-user event.");
        return;
    }

    onlineUsers.set(userId, socket.id); // Track user as online
    console.log(`User added: ${userId} -> ${socket.id}`);

    try {
        // Fetch all chats where the user is a participant
        const chats = await Chat.find({ participants: userId })
            .populate("lastMessage")
            .populate("participants", "username avatar")
            .lean();

        // Ensure the response includes roomId
        const chatList = chats.map((chat) => ({
            roomId: chat._id,
            participants: chat.participants,
            lastMessage: chat.lastMessage,
            isGroupChat: chat.isGroupChat,
            groupName: chat.groupName || null,
        }));

        console.log("Chats loaded for user:", chatList);

        // Emit the chat list to the client
        socket.emit("chat-list", chatList);
    } catch (error) {
        console.error("Error loading user chats:", error.message);
        socket.emit("chat-list-error", { message: "Error loading user chats" });
    }
};

module.exports = handleAddUser;