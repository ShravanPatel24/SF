const ChatMessage = require("../../models/Chats/message.model");
const User = require("../../models/user.model");

const handleGetChats = async (socket, rawData) => {
    console.log("🚀 ~ file: getChats.js:4 ~ handleGetChats ~ rawData:", rawData)
    try {
        // Parse rawData if it is a string
        let parsedData;
        try {
            parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        } catch (err) {
            console.error("Error parsing rawData for get-chats:", err.message);
            socket.emit("get-chats-error", { message: "Invalid data format" });
            return;
        }

        // Extract userId and optional filters from parsed data
        const userId = parsedData?.data?.userId ? parsedData?.data?.userId : parsedData?.userId;
        const { roomId, lastMessageTimeStamp } = parsedData?.data || {};

        if (!userId) {
            console.log("User ID is missing in get-chats event.");
            socket.emit("get-chats-error", { message: "User ID is required" });
            return;
        }

        console.log(`Fetching chats for userId: ${userId}`);

        // Build the query condition
        const condition = {
            ...(roomId ? { chat: roomId } : { participants: userId }),
            deletedBy: { $nin: [userId] },
        };

        if (lastMessageTimeStamp) {
            condition.updatedAt = { $lt: new Date(lastMessageTimeStamp) }; // Time filter
        }

        console.log("Query condition:", condition);

        // Fetch chats with pagination
        const options = {
            limit: 20,
            sort: { updatedAt: -1 }, // Sort by updatedAt in descending order
            lean: true,
        };

        const chats = await ChatMessage.paginate(condition, options);

        if (!chats.docs.length) {
            console.log(`No chats found for userId: ${userId}`);
        }

        // Fetch sender details for each message
        const senderIds = [
            ...new Set(chats.docs.map((chat) => chat.sender.toString())),
        ];
        const senderDetails = await User.find(
            { _id: { $in: senderIds } },
            "username avatar email"
        );

        // Map sender details to chat messages
        chats.docs.forEach((message) => {
            const sender = senderDetails.find(
                (user) => user._id.toString() === message.sender.toString()
            );
            if (sender) {
                message.senderData = sender;
            }
        });

        console.log("Retrieved chats:", JSON.stringify(chats, null, 2));

        // Emit the chats to the client
        socket.emit("get-chats-response", chats);
    } catch (error) {
        console.error("Error fetching chats:", error.message);
        socket.emit("get-chats-error", { message: "Error fetching chats" });
    }
};

module.exports = handleGetChats;