const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
    console.warn('GEMINI_API_KEY not found in environment variables');
}

// Language code mapping for Gemini
const languageMap = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
};

// Store active rooms
const rooms = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        const room = rooms.get(roomId) || { users: [] };
        room.users.push(socket.id);
        rooms.set(roomId, room);

        // Notify other users in the room
        const otherUsers = room.users.filter(id => id !== socket.id);
        if (otherUsers.length > 0) {
            socket.to(roomId).emit('user-joined');
        }

        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data.offer);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data.answer);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data.candidate);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        const room = rooms.get(roomId);
        if (room) {
            room.users = room.users.filter(id => id !== socket.id);
            if (room.users.length === 0) {
                rooms.delete(roomId);
            } else {
                socket.to(roomId).emit('user-left');
            }
        }
        console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms
        for (const [roomId, room] of rooms.entries()) {
            if (room.users.includes(socket.id)) {
                room.users = room.users.filter(id => id !== socket.id);
                if (room.users.length > 0) {
                    socket.to(roomId).emit('user-left');
                } else {
                    rooms.delete(roomId);
                }
            }
        }
    });
});

// Translation API endpoint
app.post('/api/translate', async (req, res) => {
    try {
        const { text, sourceLanguage, targetLanguage } = req.body;

        if (!text || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        if (!genAI) {
            return res.status(500).json({ error: 'Gemini API not configured' });
        }

        const sourceLangName = languageMap[sourceLanguage] || 'English';
        const targetLangName = languageMap[targetLanguage] || 'English';

        // Use Gemini for translation
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
        Only provide the translation, no explanations or additional text.
        Text to translate: "${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text().trim();

        res.json({ translatedText });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: 'Translation failed', details: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', geminiConfigured: !!genAI });
});

// Start server (for Render, Railway, and local development)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!genAI) {
        console.warn('⚠️  GEMINI_API_KEY not set. Translation will not work.');
        console.warn('   Please set GEMINI_API_KEY environment variable');
    } else {
        console.log('✅ Gemini API configured');
    }
});

