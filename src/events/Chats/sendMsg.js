const Chat = require("../../models/Chats/chat.model");
const ChatMessage = require("../../models/Chats/message.model");

const handleSendMsg = async (socket, onlineUsers, rawData) => {
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
    const msg = parsedData?.data?.msg || ""; // Allow empty message for attachments
    const attachments = parsedData?.data?.attachments || []; // Array of attachments

    if (!from || !to || (!msg && attachments.length === 0)) {
        console.log("Missing fields in send-msg event:", { from, to, msg, attachments });
        return;
    }

    console.log(`Send message: from ${from} to ${to}`);

    try {
        // Find or create the chat
        let chat = await Chat.findOne({ participants: { $all: [from, to] } });

        if (!chat) {
            chat = new Chat({ participants: [from, to], isGroupChat: false });
            await chat.save();
        }

        // Save the message
        const chatMessage = new ChatMessage({
            chat: chat._id,
            sender: from,
            content: msg,
            attachments: attachments.map((attachment) => ({
                url: attachment.url,
                localPath: attachment.localPath || null,
                type: attachment.type,
            })),
        });
        await chatMessage.save();

        // Update the lastMessage field in the chat
        chat.lastMessage = chatMessage._id;
        await chat.save();

        console.log("Message saved to database:", chatMessage);

        // Emit the message to the recipient if they are online
        const recipientSocket = onlineUsers.get(to);
        if (recipientSocket) {
            socket.to(recipientSocket).emit("msg-receive", {
                from,
                message: {
                    content: msg,
                    attachments: attachments,
                    timestamp: chatMessage.createdAt,
                },
            });
            console.log(`Message sent from ${from} to ${to}`);
        } else {
            console.log(`User ${to} is not online.`);
        }
    } catch (error) {
        console.error("Error handling send-msg event:", error.message);
    }
};

module.exports = handleSendMsg;