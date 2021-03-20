import http from "http";
import express from "express";
import socketIO from "socket.io";
import * as config from "./config";

(async () => {
  const app = express();
  const server = http.createServer(app);

  app.use(express.static(`${__dirname}/../public`));

  const io = (socketIO as any)(server) as socketIO.Server;

  let connectedUsers = [];

  io.on("connection", (socket) => {
    connectedUsers.push(socket.id);

    const otherUsers = connectedUsers.filter(socketId => socketId !== socket.id);
    socket.emit("other-users", otherUsers);

    socket.on("offer", (socketId, description) => {
      socket.to(socketId).emit("offer", socket.id, description);
    });

    socket.on("answer", (socketId, description) => {
      socket.to(socketId).emit("answer", description);
    });

    socket.on("candidate", (socketId, candidate) => {
      socket.to(socketId).emit("candidate", candidate);
    });

    socket.on("disconnect", () => {
      connectedUsers = connectedUsers.filter(socketId => socketId !== socket.id);
    });
  });

  server.listen(
    config.port,
    () => {
      console.log(`Server is listening on http://localhost:${config.port} in ${config.env} mode`);
    }
  );
})();