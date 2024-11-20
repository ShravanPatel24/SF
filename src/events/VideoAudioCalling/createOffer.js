const createOffer = (socket, onlineUsers, rawData) => {
    const { to, offer } = rawData || {}; // Fix the destructuring to directly use rawData

    if (!to || !offer) {
        console.log("Invalid createOffer payload received:", rawData);
        return;
    }

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("incomingOffer", { from: socket.id, offer });
        console.log(`Offer sent from ${socket.id} to ${to}`);
    } else {
        console.log(`Recipient ${to} is not online.`);
        socket.emit("callFailed", { message: "Recipient is not online." });
    }
};

module.exports = createOffer;
