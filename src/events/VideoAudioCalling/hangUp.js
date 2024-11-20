const hangUp = (socket, onlineUsers, rawData) => {
    const { to } = rawData?.data || {};

    if (!to) {
        console.log("Missing fields in hangUp event:", { to });
        return;
    }

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("callEnded", { from: socket.id });
        console.log(`Call ended by ${socket.id} for ${to}`);
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = hangUp;