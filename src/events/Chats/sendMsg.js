const Chat = require("../../models/Chats/chat.model");
const ChatMessage = require("../../models/Chats/message.model");

const handleSendMsg = async (socket, onlineUsers, rawData) => {
    console.log("handleSendMsg triggered with rawData:", rawData); // Debugging log

    let parsedData;
    try {
        parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        console.log("Parsed data:", parsedData); // Debugging log
    } catch (error) {
        console.log("Error parsing send-msg rawData:", error.message);
        return;
    }

    const { from, to, msg, attachments = [] } = parsedData?.data || {};

    if (!from || !to || (!msg && attachments.length === 0)) {
        console.log("Missing fields in send-msg event:", { from, to, msg, attachments });
        return;
    }

    try {
        console.log(`Processing message from ${from} to ${to}...`); // Debugging log

        // Find or create the chat room
        let chat = await Chat.findOne({ participants: { $all: [from, to] } });

        if (!chat) {
            chat = new Chat({ participants: [from, to], isGroupChat: false });
            await chat.save();
            console.log("New chat room created:", chat._id); // Debugging log
            socket.emit("new-room-created", { roomId: chat._id, participants: [from, to] });
        }

        // Save the message
        const chatMessage = new ChatMessage({
            chat: chat._id,
            sender: from,
            content: msg,
            attachments: attachments.map((attachment) => ({
                url: attachment.url,
                type: attachment.type,
            })),
        });
        await chatMessage.save();

        // Update the last message in the chat
        chat.lastMessage = chatMessage._id;
        await chat.save();

        console.log("Message saved to database:", chatMessage); // Debugging log

        // Emit the message to the recipient
        const recipientSocket = onlineUsers.get(to);
        if (recipientSocket) {
            console.log(`Sending message to recipient socket: ${recipientSocket}`); // Debugging log
            socket.to(recipientSocket).emit("msg-receive", {
                roomId: chat._id,
                from,
                message: {
                    content: msg,
                    attachments,
                    timestamp: chatMessage.createdAt,
                },
            });
        } else {
            console.log(`Recipient ${to} is not online.`); // Debugging log
        }
    } catch (error) {
        console.error("Error handling send-msg event:", error.message);
    }
};

module.exports = handleSendMsg;