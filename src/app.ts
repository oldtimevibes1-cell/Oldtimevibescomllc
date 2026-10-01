import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const publicDir = path.resolve(process.cwd(), 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

// Check if API key exists
const apiKey = process.env.GEMINI_API_KEY;
const hasApiKey = !!apiKey;

// Initialize Gemini AI (only if API key exists)
let genAI: GoogleGenAI | null = null;
if (hasApiKey) {
    genAI = new GoogleGenAI({ apiKey });
}

// Store chat history
const chatHistory: Array<{ role: 'user' | 'model', parts: string }> = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('send-message', async (data: { message: string }) => {
        try {
            const { message } = data;

            // Check if API key is configured
            if (!genAI) {
                socket.emit('stream-error', {
                    error: 'API key not configured. Please add your GEMINI_API_KEY to the .env file and restart the server.'
                });
                return;
            }

            // Add user message to history
            chatHistory.push({ role: 'user', parts: message });

            // Generate content stream using modern gemini-3.5-flash-lite model
            const contents = chatHistory.map(msg => ({
                role: msg.role === 'model' ? ('model' as const) : ('user' as const),
                parts: [{ text: msg.parts }]
            }));

            const response = await genAI.models.generateContentStream({
                model: 'gemini-3.5-flash-lite',
                contents
            });

            // Send acknowledgment that streaming started
            socket.emit('stream-start');

            let fullResponse = '';
            let i = 0;
            for await (const chunk of response) {
                const chunkText = chunk.text;
                const data = (chunk as any).data;
                if (chunkText) {
                    fullResponse += chunkText;
                    socket.emit('stream-chunk', { text: chunkText });
                } else if (data) {
                    const fileName = `generate_content_streaming_image_${i++}.png`;
                    console.debug(`Writing response image to file: ${fileName}.`);
                    fs.writeFileSync(fileName, data);
                }
            }

            // Add AI response to history
            chatHistory.push({ role: 'model', parts: fullResponse });

            // Send completion signal
            socket.emit('stream-end');

        } catch (error) {
            console.error('Error generating response:', error);
            const message = error instanceof Error ? error.message : String(error);

            // Check for specific API key errors
            if (message.includes('API_KEY_INVALID') || message.includes('403') || message.includes('Forbidden')) {
                socket.emit('stream-error', {
                    error: 'Invalid API key. Please check your GEMINI_API_KEY in the .env file and get a valid key from https://aistudio.google.com/app/apikey'
                });
            } else if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
                socket.emit('stream-error', {
                    error: 'Rate limit reached on current model. Please wait a few seconds and try again.'
                });
            } else {
                socket.emit('stream-error', { error: 'Failed to generate response. Error: ' + message });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// API endpoint to check if API key exists
app.get('/api-key-exists', (req, res) => {
    res.json({ exists: hasApiKey });
});

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
