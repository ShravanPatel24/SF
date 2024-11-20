const handleStopTyping = (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing stop-typing rawData:", error.message);
        return;
    }

    const from = parsedData?.data?.from;
    const to = parsedData?.data?.to;

    if (!from || !to) {
        console.log("Missing fields in stop-typing event:", { from, to });
        return;
    }

    console.log(`User ${from} stopped typing to ${to}`);

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("stop-typing", { from });
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = handleStopTyping;