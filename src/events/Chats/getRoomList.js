const Chat = require("../../models/Chats/chat.model");

const handleGetRoomList = async (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing get-room-list rawData:", error.message);
        socket.emit("room-list-error", { message: "Invalid data format" });
        return;
    }

    // Correctly access userId from parsedData.data
    const userId = parsedData?.data?.userId;

    if (!userId) {
        console.log("User ID is missing in get-room-list event.");
        socket.emit("room-list-error", { message: "User ID is required" });
        return;
    }

    try {
        // Fetch all chats where the user is a participant
        const chats = await Chat.find({ participants: userId })
            .populate("lastMessage")
            .populate("participants", "username avatar email")
            .sort({ updatedAt: -1 })
            .lean();

        // Format the chat list with room IDs
        const roomList = chats.map((chat) => ({
            roomId: chat._id, // Room ID
            participants: chat.participants.filter((p) => p._id.toString() !== userId), // Other participants
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt,
        }));

        console.log("Fetched room list:", roomList);

        // Emit the room list to the client
        socket.emit("room-list", roomList);
    } catch (error) {
        console.error("Error fetching room list:", error.message);
        socket.emit("room-list-error", { message: "Error fetching room list" });
    }
};

module.exports = handleGetRoomList;