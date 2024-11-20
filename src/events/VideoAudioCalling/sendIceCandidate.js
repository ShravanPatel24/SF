const sendIceCandidate = (socket, onlineUsers, rawData) => {
    const { to, candidate } = rawData || {}; // Fix the destructuring to directly use rawData

    if (!to || !candidate) {
        console.log("Invalid sendIceCandidate payload received:", rawData);
        return;
    }

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("iceCandidate", { from: socket.id, candidate });
        console.log(`ICE candidate sent from ${socket.id} to ${to}`);
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = sendIceCandidate;
