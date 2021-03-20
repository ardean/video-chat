(async () => {
  const videoGrid = document.getElementById("video-grid");
  const messagesEl = document.querySelector(".messages");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("message-button");
  const localVideo = document.getElementById("local-video");
  const remoteVideo = document.getElementById("remote-video");

  const logMessage = (message) => {
    const newMessage = document.createElement("div");
    newMessage.innerText = message;
    messagesEl.appendChild(newMessage);
    console.log(message);
  };

  (async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      videoGrid.style.display = "grid";
      localVideo.srcObject = stream;

      initConnection(stream);
    } catch (err) {
      console.log(error)
    }
  })();

  const initConnection = (stream) => {
    const socket = io("/");
    let localConnection;
    let remoteConnection;
    let localChannel;
    let remoteChannel;

    socket.on("other-users", (otherUsers) => {
      if (!otherUsers || !otherUsers.length) return;

      const socketId = otherUsers[0];

      localConnection = new RTCPeerConnection();

      stream.getTracks().forEach(track => localConnection.addTrack(track, stream));

      localConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("candidate", socketId, candidate);
        }
      };

      localConnection.ontrack = ({ streams: [stream] }) => {
        remoteVideo.srcObject = stream;
      };

      localChannel = localConnection.createDataChannel("chat_channel");

      localChannel.onmessage = (event) => logMessage(`Receive: ${event.data}`);
      localChannel.onopen = (event) => logMessage(`Channel Changed: ${event.type}`);
      localChannel.onclose = (event) => logMessage(`Channel Changed: ${event.type}`);

      localConnection
        .createOffer()
        .then(offer => localConnection.setLocalDescription(offer))
        .then(() => {
          console.log("sending offer", socketId, localConnection.localDescription);
          socket.emit("offer", socketId, localConnection.localDescription);
        });
    });

    socket.on("offer", (socketId, description) => {
      console.log("received offer", socketId, description);
      remoteConnection = new RTCPeerConnection();

      stream.getTracks().forEach(track => remoteConnection.addTrack(track, stream));

      remoteConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit("candidate", socketId, candidate);
        }
      };

      remoteConnection.ontrack = ({ streams: [stream] }) => {
        remoteVideo.srcObject = stream;
      };

      remoteConnection.ondatachannel = ({ channel }) => {
        remoteChannel = channel;

        remoteChannel.onmessage = (event) => logMessage(`Receive: ${event.data}`);
        remoteChannel.onopen = (event) => logMessage(`Channel Changed: ${event.type}`);
        remoteChannel.onclose = (event) => logMessage(`Channel Changed: ${event.type}`);
      }

      remoteConnection
        .setRemoteDescription(description)
        .then(() => remoteConnection.createAnswer())
        .then(answer => remoteConnection.setLocalDescription(answer))
        .then(() => {
          console.log("sending answer", socketId, remoteConnection.localDescription);
          socket.emit("answer", socketId, remoteConnection.localDescription);
        });
    });

    socket.on("answer", (description) => {
      console.log("received answer", description);
      localConnection.setRemoteDescription(description);
    });

    socket.on("candidate", (candidate) => {
      console.log("received candidate", candidate);
      const connection = localConnection || remoteConnection;
      connection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    sendButton.addEventListener("click", () => {
      const message = messageInput.value;
      messageInput.value = "";
      logMessage(`Send: ${message}`);

      const channel = localChannel || remoteChannel;
      channel.send(message);
    });
  }
})();