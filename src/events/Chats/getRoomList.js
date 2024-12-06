const Chat = require("../../models/Chats/chat.model");
const ChatMessage = require("../../models/Chats/message.model");

const handleGetRoomList = async (socket, rawData) => {
    console.log("🚀 ~ file: getRoomList.js:4 ~ handleGetRoomList ~ rawData:", rawData)

    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing get-room-list rawData:", error.message);
        socket.emit("room-list-error", { message: "Invalid data format" });
        return;
    }

    const userId = parsedData?.data?.userId ? parsedData?.data?.userId : parsedData?.userId;

    if (!userId) {
        console.log("User ID is missing in get-room-list event.");
        socket.emit("room-list-error", { message: "User ID is required" });
        return;
    }

    try {
        console.log("Fetching chats for userId:", userId);

        const chats = await Chat.find({ participants: userId })
            .populate("lastMessage")
            .populate("participants", "name profilePhoto email")
            .sort({ updatedAt: -1 })
            .lean();

        console.log("Raw chats fetched from DB:", JSON.stringify(chats, null, 2));

        const roomList = await Promise.all(
            chats.map(async (chat) => {
                console.log(`Processing chat room ${chat._id}...`);
                console.log("Participants:", JSON.stringify(chat.participants, null, 2));

                const otherParticipants = chat.participants.filter(
                    (p) => p._id.toString() !== userId
                );

                console.log("Other participants:", JSON.stringify(otherParticipants, null, 2));

                const formattedParticipants = otherParticipants.map((p) => ({
                    _id: p._id,
                    name: p.name,
                    profilePhoto: p.profilePhoto,
                }));

                console.log("Formatted participants:", JSON.stringify(formattedParticipants, null, 2));

                const unreadCount = await ChatMessage.countDocuments({
                    chat: chat._id,
                    receiver: userId,
                    read: false,
                });

                console.log(`Unread messages count for chat ${chat._id}:`, unreadCount);

                return {
                    roomId: chat._id,
                    participants: formattedParticipants,
                    lastMessage: chat.lastMessage,
                    unreadCount,
                    updatedAt: chat.updatedAt,
                };
            })
        );

        console.log("Final room list:", JSON.stringify(roomList, null, 2));

        socket.emit("room-list", roomList);
    } catch (error) {
        console.error("Error fetching room list:", error.message);
        socket.emit("room-list-error", { message: "Error fetching room list" });
    }
};

module.exports = handleGetRoomList;