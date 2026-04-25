

  export default function chatSocket(io, socket) {
    // Get username from socket (set during auth handshake in SocketServer.js)
    const username = socket.username;

    // socket.on("joinChat", ({ roomId }) => {
    //   socket.join(roomId);
    //   console.log("gameRoomId",roomId);

    //   io.to(roomId).emit("receiveMessage", {
    //     id: Date.now(),
    //     sender: "System",
    //     content: `${username} joined the chat`,
    //     type: "system",
    //     time: new Date().toLocaleTimeString()
    //   });
    // });
    
    socket.on("sendMessage", ({ roomId, message ,type}) => {
      io.to(roomId).emit("receiveMessage", {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: type === "system" ? "System" : username,
        content: message,
        type,
        time: new Date().toLocaleTimeString()
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", username);
    });
  }

