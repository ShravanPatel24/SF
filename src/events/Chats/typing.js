const handleTyping = (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing typing rawData:", error.message);
        return;
    }

    const from = parsedData?.data?.from;
    const to = parsedData?.data?.to;

    if (!from || !to) {
        console.log("Missing fields in typing event:", { from, to });
        return;
    }

    console.log(`User ${from} is typing to ${to}`);

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("typing", { from });
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = handleTyping;