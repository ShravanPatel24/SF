const handleDisconnect = (socket, onlineUsers) => {
    console.log(`Client disconnected: ${socket.id}`);
    for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
            onlineUsers.delete(userId);
            console.log(`User ${userId} removed from online users.`);
            break;
        }
    }

    console.log("Current online users:", Array.from(onlineUsers.entries()));
};

module.exports = handleDisconnect;