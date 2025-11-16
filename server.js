const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());

// Serve static files (CSS, JS, etc.)
app.use(express.static(path.join(__dirname), {
    index: false // Don't serve index.html automatically, we'll handle it explicitly
}));

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

// Store active rooms with user info
const rooms = new Map(); // roomId -> { users: [{ socketId, userId, language }] }

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (data) => {
        const { roomId, userId, language } = data;
        socket.join(roomId);
        
        const room = rooms.get(roomId) || { users: [] };
        const existingUserIndex = room.users.findIndex(u => u.socketId === socket.id);
        
        if (existingUserIndex === -1) {
            room.users.push({ socketId: socket.id, userId, language });
            rooms.set(roomId, room);
        } else {
            // Update existing user
            room.users[existingUserIndex].userId = userId;
            room.users[existingUserIndex].language = language;
        }

        // Notify other users in the room
        const otherUsers = room.users.filter(u => u.socketId !== socket.id);
        if (otherUsers.length > 0) {
            socket.to(roomId).emit('user-joined', {
                userId,
                isInitiator: false
            });
            // Notify the new user about existing users
            otherUsers.forEach(otherUser => {
                socket.emit('user-joined', {
                    userId: otherUser.userId,
                    isInitiator: true
                });
            });
        }

        console.log(`User ${userId} (${socket.id}) joined room ${roomId} with language ${language}`);
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

    socket.on('translate-request', async (data) => {
        const { roomId, userId, text, sourceLanguage } = data;
        const room = rooms.get(roomId);
        
        if (!room) {
            return;
        }

        // Get all other users in the room
        const otherUsers = room.users.filter(u => u.userId !== userId);
        
        if (otherUsers.length === 0) {
            return;
        }

        // Translate for each user in their preferred language
        const translationPromises = otherUsers.map(async (user) => {
            try {
                const translatedText = await translateText(text, sourceLanguage, user.language);
                return {
                    targetUserId: user.userId,
                    translatedText
                };
            } catch (error) {
                console.error(`Translation error for user ${user.userId}:`, error);
                return {
                    targetUserId: user.userId,
                    translatedText: null
                };
            }
        });

        const translations = await Promise.all(translationPromises);
        
        // Send translations to each user
        translations.forEach(translation => {
            if (translation.translatedText) {
                const targetUser = otherUsers.find(u => u.userId === translation.targetUserId);
                if (targetUser) {
                    io.to(targetUser.socketId).emit('translation-result', {
                        targetUserId: translation.targetUserId,
                        translatedText: translation.translatedText,
                        sourceUserId: userId
                    });
                }
            }
        });
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        const room = rooms.get(roomId);
        if (room) {
            room.users = room.users.filter(u => u.socketId !== socket.id);
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
            const userIndex = room.users.findIndex(u => u.socketId === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                if (room.users.length > 0) {
                    socket.to(roomId).emit('user-left');
                } else {
                    rooms.delete(roomId);
                }
            }
        }
    });
});

// Translate text using Gemini API
async function translateText(text, sourceLanguage, targetLanguage) {
    if (!text || !sourceLanguage || !targetLanguage) {
        throw new Error('Missing required parameters');
    }

    if (!genAI) {
        throw new Error('Gemini API not configured');
    }

    // If same language, return original text
    if (sourceLanguage === targetLanguage) {
        return text;
    }

    const sourceLangName = languageMap[sourceLanguage] || 'English';
    const targetLangName = languageMap[targetLanguage] || 'English';

    try {
        // Use Gemini for translation
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. 
        Only provide the translation, no explanations or additional text.
        Text to translate: "${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translatedText = response.text().trim();

        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

// Translation API endpoint (for direct HTTP requests)
app.post('/api/translate', async (req, res) => {
    try {
        const { text, sourceLanguage, targetLanguage } = req.body;

        if (!text || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const translatedText = await translateText(text, sourceLanguage, targetLanguage);
        res.json({ translatedText });
    } catch (error) {
        console.error('Translation API error:', error);
        res.status(500).json({ error: 'Translation failed', details: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', geminiConfigured: !!genAI });
});

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes or socket.io
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
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
