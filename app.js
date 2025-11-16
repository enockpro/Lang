// WebRTC and Socket.io setup
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let socket = null;
let recognition = null;
let isRecognizing = false;
let userLanguage = 'en';
let partnerLanguage = 'en';
let roomId = '';

// Socket.io connection
const socketUrl = window.location.origin;
socket = io(socketUrl);

// DOM elements
const setupSection = document.getElementById('setupSection');
const callSection = document.getElementById('callSection');
const joinBtn = document.getElementById('joinBtn');
const roomIdInput = document.getElementById('roomId');
const userLanguageSelect = document.getElementById('userLanguage');
const partnerLanguageSelect = document.getElementById('partnerLanguage');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const endCallBtn = document.getElementById('endCallBtn');
const originalText = document.getElementById('originalText');
const translatedText = document.getElementById('translatedText');
const connectionStatus = document.getElementById('connectionStatus');

// WebRTC configuration
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Generate random room ID if empty
    if (!roomIdInput.value) {
        roomIdInput.value = generateRoomId();
    }

    joinBtn.addEventListener('click', joinCall);
    muteBtn.addEventListener('click', toggleMute);
    videoBtn.addEventListener('click', toggleVideo);
    endCallBtn.addEventListener('click', endCall);
});

// Generate random room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 9);
}

// Join call
async function joinCall() {
    roomId = roomIdInput.value.trim();
    userLanguage = userLanguageSelect.value;
    partnerLanguage = partnerLanguageSelect.value;

    if (!roomId) {
        alert('Please enter a room ID');
        return;
    }

    try {
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;
        setupSection.classList.add('hidden');
        callSection.classList.remove('hidden');

        // Join room
        socket.emit('join-room', roomId);

        // Start speech recognition
        startSpeechRecognition();

        connectionStatus.textContent = 'Waiting for partner...';
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Error accessing camera/microphone. Please check permissions.');
    }
}

// Socket event handlers
socket.on('user-joined', async () => {
    connectionStatus.textContent = 'Partner joined! Creating connection...';
    await createPeerConnection();
    await createOffer();
});

socket.on('offer', async (offer) => {
    await createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer, roomId });
});

socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
});

socket.on('user-left', () => {
    connectionStatus.textContent = 'Partner left the call';
    endCall();
});

// Create peer connection
async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
        connectionStatus.textContent = 'Connected';
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, roomId });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        connectionStatus.textContent = `Connection: ${peerConnection.connectionState}`;
    };
}

// Create offer
async function createOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId });
}

// Speech recognition
function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getLanguageCode(userLanguage);

    recognition.onresult = async (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            originalText.textContent = finalTranscript.trim();
            await translateText(finalTranscript.trim());
        } else if (interimTranscript) {
            originalText.textContent = interimTranscript;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            // Restart recognition if no speech detected
            setTimeout(() => {
                if (!isRecognizing) {
                    recognition.start();
                    isRecognizing = true;
                }
            }, 1000);
        }
    };

    recognition.onend = () => {
        isRecognizing = false;
        // Restart recognition
        setTimeout(() => {
            if (!isRecognizing) {
                recognition.start();
                isRecognizing = true;
            }
        }, 100);
    };

    recognition.start();
    isRecognizing = true;
}

// Translate text using Gemini API
async function translateText(text) {
    if (!text.trim()) return;

    try {
        // Use serverless function endpoint for Vercel
        const apiUrl = window.location.origin + '/api/translate';
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                sourceLanguage: userLanguage,
                targetLanguage: partnerLanguage
            })
        });

        const data = await response.json();
        if (data.translatedText) {
            translatedText.textContent = data.translatedText;
        }
    } catch (error) {
        console.error('Translation error:', error);
    }
}

// Get language code for speech recognition
function getLanguageCode(lang) {
    const langMap = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'it': 'it-IT',
        'pt': 'pt-BR',
        'ru': 'ru-RU',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'zh': 'zh-CN',
        'ar': 'ar-SA',
        'hi': 'hi-IN'
    };
    return langMap[lang] || 'en-US';
}

// Toggle mute
function toggleMute() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            muteBtn.innerHTML = audioTrack.enabled 
                ? '<span class="icon">🔇</span><span>Mute</span>'
                : '<span class="icon">🔊</span><span>Unmute</span>';
        }
    }
}

// Toggle video
function toggleVideo() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            videoBtn.innerHTML = videoTrack.enabled
                ? '<span class="icon">📹</span><span>Video</span>'
                : '<span class="icon">📵</span><span>Show Video</span>';
        }
    }
}

// End call
function endCall() {
    if (recognition) {
        recognition.stop();
        isRecognizing = false;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    socket.emit('leave-room', roomId);

    setupSection.classList.remove('hidden');
    callSection.classList.add('hidden');
    originalText.textContent = '';
    translatedText.textContent = '';
    connectionStatus.textContent = '';
}

