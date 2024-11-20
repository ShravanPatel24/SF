const handlePingPong = (socket) => {
    socket.on("ping", () => {
        console.log(`Ping received from ${socket.id}`);
        socket.emit("pong", { message: "Pong!" });
    });
};

module.exports = handlePingPong;