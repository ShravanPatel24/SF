const handleMessageSeen = (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing message-seen rawData:", error.message);
        return;
    }

    const messageId = parsedData?.data?.messageId;
    const to = parsedData?.data?.to;

    if (!messageId || !to) {
        console.log("Missing fields in message-seen event:", { messageId, to });
        return;
    }

    console.log(`Message ${messageId} seen by ${to}`);

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("message-seen", { messageId });
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = handleMessageSeen;