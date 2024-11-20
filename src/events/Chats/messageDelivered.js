const handleMessageDelivered = (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing message-delivered rawData:", error.message);
        return;
    }

    const messageId = parsedData?.data?.messageId;
    const to = parsedData?.data?.to;

    if (!messageId || !to) {
        console.log("Missing fields in message-delivered event:", { messageId, to });
        return;
    }

    console.log(`Message ${messageId} delivered to ${to}`);

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("message-delivered", { messageId });
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = handleMessageDelivered;  