const handleNotifyUser = (socket, onlineUsers, rawData) => {
    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    } catch (error) {
        console.log("Error parsing notify-user rawData:", error.message);
        return;
    }

    const to = parsedData?.data?.to;
    const notification = parsedData?.data?.notification;

    if (!to || !notification) {
        console.log("Missing fields in notify-user event:", { to, notification });
        return;
    }

    console.log(`Notify user ${to}: ${notification}`);

    const recipientSocket = onlineUsers.get(to);
    if (recipientSocket) {
        socket.to(recipientSocket).emit("notification", { notification });
    } else {
        console.log(`Recipient ${to} is not online.`);
    }
};

module.exports = handleNotifyUser;