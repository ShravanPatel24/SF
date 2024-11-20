const createAnswer = (socket, onlineUsers, rawData) => {
    const { to, answer } = rawData?.data || {};

    if (!to || !answer) {
        console.log("Missing fields in createAnswer event:", { to, answer });
        return;
    }

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("incomingAnswer", { from: socket.id, answer });
        console.log(`Answer sent from ${socket.id} to ${to}`);
    } else {
        console.log(`Recipient ${to} is not online.`);
        socket.emit("callFailed", { message: "Recipient is not online." });
    }
};

module.exports = createAnswer;