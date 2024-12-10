const socket = io.connect();

// Video elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Media stream and peer connection
let localStream;
let peerConnection;

// STUN server configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const messageInput = document.getElementById('messageInput');
const messagesDiv = document.getElementById('messages');
const sendMessageButton = document.getElementById('sendMessage');

// Send a message
sendMessageButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message.trim()) {
        socket.emit('chat-message', message);
        appendMessage(`You: ${message}`);
        messageInput.value = '';
    }
});

// Receive messages
socket.on('chat-message', (message) => {
    appendMessage(`Peer: ${message}`);
});

function appendMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
}

// Get user media (camera and microphone)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

// Handle signaling
socket.on('offer', async (offer) => {
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', peerConnection.localDescription);
});

const roomInput = prompt("Enter room name to join:");
socket.emit('join-room', { room: roomInput });

// Listen for notifications
socket.on('user-joined', (message) => {
    console.log(message);
});

socket.on('user-left', (message) => {
    console.log(message);
});

const muteAudioButton = document.getElementById('muteAudio');
const toggleVideoButton = document.getElementById('toggleVideo');

muteAudioButton.addEventListener('click', () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    muteAudioButton.textContent = localStream.getAudioTracks()[0].enabled ? 'Mute' : 'Unmute';
});

toggleVideoButton.addEventListener('click', () => {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
    toggleVideoButton.textContent = localStream.getVideoTracks()[0].enabled ? 'Stop Video' : 'Start Video';
});

socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});


const shareScreenButton = document.createElement('button');
shareScreenButton.textContent = "Share Screen";
document.body.appendChild(shareScreenButton);

shareScreenButton.addEventListener('click', async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        peerConnection.getSenders().find(sender => sender.track.kind === 'video').replaceTrack(screenTrack);

        // Revert to the original stream when screen sharing stops
        screenTrack.onended = () => {
            peerConnection.getSenders().find(sender => sender.track.kind === 'video').replaceTrack(localStream.getVideoTracks()[0]);
        };
    } catch (error) {
        console.error('Error sharing screen:', error);
    }
});


socket.on('ice-candidate', (candidate) => {
    if (candidate) {
        peerConnection.addIceCandidate(candidate);
    }
});

// Create peer connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to the peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Display remote stream
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate);
        }
    };
}

// Start the video call
function startCall() {
    if (!peerConnection) createPeerConnection();
    peerConnection.createOffer()
        .then(offer => {
            peerConnection.setLocalDescription(offer);
            socket.emit('offer', offer);
        });
}

// Start the call when the page loads
startCall();
