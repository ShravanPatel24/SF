const handleSendMsg = (socket, onlineUsers, rawData) => {
    console.log("Send message rawData:", rawData);

    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing send-msg rawData:", error.message);
        return;
    }

    console.log("Parsed send-msg data:", parsedData);

    const from = parsedData?.data?.from;
    const to = parsedData?.data?.to;
    const msg = parsedData?.data?.msg;

    if (!from || !to || !msg) {
        console.log("Missing fields in send-msg event:", { from, to, msg });
        return;
    }

    console.log(`Send message: from ${from} to ${to}`);

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("msg-receive", { from, message: msg });
        console.log(`Message sent from ${from} to ${to}`);
    } else {
        console.log(`User ${to} is not online or not added.`);
    }
};

module.exports = handleSendMsg;