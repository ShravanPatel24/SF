const handleChatListUpdate = (socket, onlineUsers, rawData) => {
    console.log("Received rawData for handleChatListUpdate:", rawData);

    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.error("Error parsing rawData:", error.message);
        socket.emit("room-list-error", { message: "Invalid data format" });
        return;
    }

    const userId = parsedData?.data?.userId ? parsedData?.data?.userId : parsedData?.userId;

    if (!userId) {
        console.error("User ID is missing in handleChatListUpdate");
        return;
    }

    console.log(`User ID: ${userId}`);
    console.log("Current online users:", onlineUsers);

    // Notify the user to refresh their chat list
    const userSocket = onlineUsers.get(userId);
    if (userSocket) {
        console.log(`Notifying socket ID: ${userSocket}`);
        socket.to(userSocket).emit("refresh-chat-list");
    } else {
        console.error(`No socket found for userId: ${userId}`);
    }
};

module.exports = { handleChatListUpdate };