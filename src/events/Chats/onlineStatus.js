const onlineStatus = (socket, onlineUsers) => {
    /**
     * Check the online status of a user.
     */
    socket.on("check-user-status", (rawData) => {
        console.log("check-user-status event received:", rawData);

        let parsedData;
        try {
            // Parse the rawData if it is a string
            parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        } catch (error) {
            console.error("Error parsing rawData in check-user-status:", error.message);
            socket.emit("user-status-response", {
                error: "Invalid data format",
            });
            return;
        }

        // Extract userId from parsedData
        const userId = parsedData?.data?.userId;

        if (!userId) {
            console.log("User ID is missing in check-user-status event.");
            socket.emit("user-status-response", {
                error: "User ID is required to check status",
            });
            return;
        }

        const isOnline = onlineUsers.has(userId);
        console.log(`User ${userId} is ${isOnline ? "online" : "offline"}.`);

        socket.emit("user-status-response", {
            userId,
            status: isOnline ? "online" : "offline",
        });
    });

    /**
     * Broadcast the online/offline status of a user to other users.
     */
    socket.on("broadcast-status", (data) => {
        console.log("broadcast-status event received:", data);

        const userId = data?.userId;
        if (!userId) {
            console.log("User ID is missing in broadcast-status event.");
            return;
        }

        const isOnline = onlineUsers.has(userId);
        console.log(`Broadcasting status for user ${userId}: ${isOnline ? "online" : "offline"}`);

        socket.broadcast.emit("user-status-change", {
            userId,
            status: isOnline ? "online" : "offline",
        });
    });
};

module.exports = onlineStatus;
