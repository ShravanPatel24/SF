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

    onlineUsers.set(userId, socket.id);
    console.log(`User added: ${userId} -> ${socket.id}`);

    try {
        const chats = await Chat.find({ participants: userId })
            .populate("lastMessage")
            .exec();

        console.log("Chats loaded for user:", chats);
        socket.emit("chat-list", chats);
    } catch (error) {
        console.error("Error loading user chats:", error.message);
    }
};

module.exports = handleAddUser;