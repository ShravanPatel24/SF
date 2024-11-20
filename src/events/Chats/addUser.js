const handleAddUser = (socket, onlineUsers, rawData) => {
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
    console.log("Current online users:", Array.from(onlineUsers.entries()));
};

module.exports = handleAddUser;