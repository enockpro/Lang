// WebRTC and Socket.io setup
let localStream = null;
let socket = null;
let recognition = null;
let synthesis = null;
let isRecognizing = false;
let audioEnabled = true;
let userLanguage = 'en';
let roomId = '';
let userId = '';
let peerConnections = new Map(); // userId -> RTCPeerConnection
let remoteStreams = new Map(); // userId -> MediaStream

// Socket.io connection
const socketUrl = window.location.origin;
socket = io(socketUrl);

// DOM elements
const setupSection = document.getElementById('setupSection');
const callSection = document.getElementById('callSection');
const createTabBtn = document.getElementById('createTabBtn');
const joinTabBtn = document.getElementById('joinTabBtn');
const createTab = document.getElementById('createTab');
const joinTab = document.getElementById('joinTab');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createLanguageSelect = document.getElementById('createLanguage');
const joinLanguageSelect = document.getElementById('joinLanguage');
const roomLinkInput = document.getElementById('roomLink');
const shareableLinkInput = document.getElementById('shareableLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideosContainer = document.getElementById('remoteVideosContainer');
const muteBtn = document.getElementById('muteBtn');
const videoBtn = document.getElementById('videoBtn');
const audioBtn = document.getElementById('audioBtn');
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
    // Generate unique user ID based on device/browser
    userId = generateUserId();
    console.log('User ID:', userId);
    
    // Tab switching
    createTabBtn.addEventListener('click', () => switchTab('create'));
    joinTabBtn.addEventListener('click', () => switchTab('join'));
    
    // Button handlers
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    copyLinkBtn.addEventListener('click', copyRoomLink);
    muteBtn.addEventListener('click', toggleMute);
    videoBtn.addEventListener('click', toggleVideo);
    audioBtn.addEventListener('click', toggleAudio);
    endCallBtn.addEventListener('click', endCall);

    // Check if room ID is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        roomLinkInput.value = window.location.href;
        switchTab('join');
    }
});

// Switch tabs
function switchTab(tab) {
    if (tab === 'create') {
        createTabBtn.classList.add('active');
        joinTabBtn.classList.remove('active');
        createTab.classList.add('active');
        joinTab.classList.remove('active');
    } else {
        createTabBtn.classList.remove('active');
        joinTabBtn.classList.add('active');
        createTab.classList.remove('active');
        joinTab.classList.add('active');
    }
}

// Generate unique user ID based on device
function generateUserId() {
    // Use a combination of timestamp and random to ensure uniqueness
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `user_${timestamp}_${random}`;
}

// Generate room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 10);
}

// Create room
async function createRoom() {
    userLanguage = createLanguageSelect.value;
    roomId = generateRoomId();

    try {
        // Request camera/microphone - this ensures each device is treated separately
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;
        setupSection.classList.add('hidden');
        callSection.classList.remove('hidden');

        // Update shareable link
        const shareableLink = `${window.location.origin}?room=${roomId}`;
        shareableLinkInput.value = shareableLink;
        window.history.pushState({}, '', shareableLink);

        // Join room with user language
        socket.emit('join-room', { roomId, userId, language: userLanguage });

        // Start speech recognition
        startSpeechRecognition();

        // Initialize text-to-speech
        initTextToSpeech();

        connectionStatus.textContent = 'Room created! Waiting for others to join...';
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Error accessing camera/microphone. Please check permissions.');
    }
}

// Join room
async function joinRoom() {
    const link = roomLinkInput.value.trim();
    
    if (!link) {
        alert('Please enter a room link');
        return;
    }

    // Extract room ID from link
    try {
        const url = new URL(link);
        roomId = url.searchParams.get('room') || url.pathname.split('/').pop();
    } catch (e) {
        // If not a valid URL, treat as room ID
        roomId = link;
    }

    if (!roomId) {
        alert('Invalid room link');
        return;
    }

    userLanguage = joinLanguageSelect.value;

    try {
        // Request camera/microphone - each device gets its own stream
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;
        setupSection.classList.add('hidden');
        callSection.classList.remove('hidden');

        // Update shareable link
        const shareableLink = `${window.location.origin}?room=${roomId}`;
        shareableLinkInput.value = shareableLink;
        window.history.pushState({}, '', shareableLink);

        // Join room with user language
        socket.emit('join-room', { roomId, userId, language: userLanguage });

        // Start speech recognition
        startSpeechRecognition();

        // Initialize text-to-speech
        initTextToSpeech();

        connectionStatus.textContent = 'Joining room...';
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Error accessing camera/microphone. Please check permissions.');
    }
}

// Copy room link
function copyRoomLink() {
    shareableLinkInput.select();
    document.execCommand('copy');
    const originalText = copyLinkBtn.textContent;
    copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => {
        copyLinkBtn.textContent = originalText;
    }, 2000);
}

// Socket event handlers
socket.on('user-joined', async (data) => {
    const { userId: remoteUserId, isInitiator } = data;
    
    if (remoteUserId !== userId) {
        connectionStatus.textContent = `User ${remoteUserId.substring(0, 8)}... joined! Creating connection...`;
        
        if (isInitiator) {
            // We are the existing user - create offer for the new user
            await createPeerConnection(remoteUserId);
            await createOffer(remoteUserId);
        } else {
            // We are the new user - create offer for existing user
            await createPeerConnection(remoteUserId);
            await createOffer(remoteUserId);
        }
    }
});

socket.on('user-left', (data) => {
    const { userId: leftUserId } = data;
    removeRemoteUser(leftUserId);
    updateConnectionStatus();
});

socket.on('offer', async (data) => {
    const { offer, fromUserId } = data;
    await createPeerConnection(fromUserId);
    await peerConnections.get(fromUserId).setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnections.get(fromUserId).createAnswer();
    await peerConnections.get(fromUserId).setLocalDescription(answer);
    socket.emit('answer', { answer, roomId, toUserId: fromUserId });
});

socket.on('answer', async (data) => {
    const { answer, fromUserId } = data;
    const peerConnection = peerConnections.get(fromUserId);
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

socket.on('ice-candidate', async (data) => {
    const { candidate, fromUserId } = data;
    const peerConnection = peerConnections.get(fromUserId);
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
});

socket.on('translation-result', async (data) => {
    // Receive translated text from other user
    if (data.targetUserId === userId && data.translatedText) {
        translatedText.textContent = data.translatedText;
        // Speak the translation in user's language
        if (audioEnabled) {
            speakText(data.translatedText, userLanguage);
        }
    }
});

// Create peer connection for a specific user
async function createPeerConnection(remoteUserId) {
    if (peerConnections.has(remoteUserId)) {
        return; // Already connected
    }

    const peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Add local stream tracks
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        remoteStreams.set(remoteUserId, remoteStream);
        addRemoteVideo(remoteUserId, remoteStream);
        updateConnectionStatus();
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                candidate: event.candidate,
                roomId,
                toUserId: remoteUserId
            });
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log(`Connection with ${remoteUserId}: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            removeRemoteUser(remoteUserId);
        }
        updateConnectionStatus();
    };

    peerConnections.set(remoteUserId, peerConnection);
}

// Create offer for a specific user
async function createOffer(remoteUserId) {
    const peerConnection = peerConnections.get(remoteUserId);
    if (!peerConnection) return;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId, toUserId: remoteUserId, fromUserId: userId });
}

// Add remote video element
function addRemoteVideo(remoteUserId, stream) {
    // Remove existing video if any
    const existingVideo = document.getElementById(`video-${remoteUserId}`);
    if (existingVideo) {
        existingVideo.remove();
    }

    const videoWrapper = document.createElement('div');
    videoWrapper.className = 'video-wrapper';
    videoWrapper.id = `video-wrapper-${remoteUserId}`;

    const video = document.createElement('video');
    video.id = `video-${remoteUserId}`;
    video.autoplay = true;
    video.playsinline = true;
    video.srcObject = stream;

    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = `User ${remoteUserId.substring(0, 8)}...`;

    videoWrapper.appendChild(video);
    videoWrapper.appendChild(label);
    remoteVideosContainer.appendChild(videoWrapper);
}

// Remove remote user
function removeRemoteUser(remoteUserId) {
    // Close peer connection
    const peerConnection = peerConnections.get(remoteUserId);
    if (peerConnection) {
        peerConnection.close();
        peerConnections.delete(remoteUserId);
    }

    // Remove video element
    const videoWrapper = document.getElementById(`video-wrapper-${remoteUserId}`);
    if (videoWrapper) {
        videoWrapper.remove();
    }

    remoteStreams.delete(remoteUserId);
}

// Update connection status
function updateConnectionStatus() {
    const connectedCount = peerConnections.size;
    if (connectedCount === 0) {
        connectionStatus.textContent = 'Waiting for others to join...';
    } else {
        connectionStatus.textContent = `Connected with ${connectedCount} user${connectedCount > 1 ? 's' : ''}`;
    }
}

// Initialize text-to-speech
function initTextToSpeech() {
    if ('speechSynthesis' in window) {
        synthesis = window.speechSynthesis;
    } else {
        console.warn('Text-to-speech not supported');
    }
}

// Speak text using Web Speech API
function speakText(text, lang) {
    if (!synthesis || !text.trim()) return;

    // Cancel any ongoing speech
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageCode(lang);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    synthesis.speak(utterance);
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
            const text = finalTranscript.trim();
            originalText.textContent = text;
            // Translate and broadcast to all other users
            await translateAndBroadcast(text);
        } else if (interimTranscript) {
            originalText.textContent = interimTranscript;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
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

// Translate text and broadcast to all other users
async function translateAndBroadcast(text) {
    if (!text.trim()) return;

    try {
        socket.emit('translate-request', {
            roomId,
            userId,
            text,
            sourceLanguage: userLanguage
        });
    } catch (error) {
        console.error('Translation error:', error);
    }
}

// Get language code for speech recognition and TTS
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

// Toggle audio (translated speech)
function toggleAudio() {
    audioEnabled = !audioEnabled;
    if (synthesis) {
        if (!audioEnabled) {
            synthesis.cancel();
        }
    }
    audioBtn.innerHTML = audioEnabled
        ? '<span class="icon">🔊</span><span>Audio On</span>'
        : '<span class="icon">🔇</span><span>Audio Off</span>';
}

// End call
function endCall() {
    if (recognition) {
        recognition.stop();
        isRecognizing = false;
    }

    if (synthesis) {
        synthesis.cancel();
    }

    // Close all peer connections
    peerConnections.forEach((peerConnection, remoteUserId) => {
        peerConnection.close();
        removeRemoteUser(remoteUserId);
    });
    peerConnections.clear();
    remoteStreams.clear();

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    localVideo.srcObject = null;

    socket.emit('leave-room', { roomId, userId });

    setupSection.classList.remove('hidden');
    callSection.classList.add('hidden');
    originalText.textContent = '';
    translatedText.textContent = '';
    connectionStatus.textContent = '';
    
    // Reset URL
    window.history.pushState({}, '', window.location.pathname);
}
