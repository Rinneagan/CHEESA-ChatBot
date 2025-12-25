import 'dotenv/config';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createReadStream, stat } from 'node:fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = Number(process.env.PORT || 3001);
const apiKey = process.env.GOOGLE_AI_KEY;

if (!apiKey) {
  throw new Error('Missing required environment variable: GOOGLE_AI_KEY');
}

const genAI = new GoogleGenerativeAI(apiKey);

const systemPrompt = `You are CHEEStron, a helpful AI assistant for the Chemical Engineering Student Association (CHEESA) at KNUST. 
Your role is to provide information about:
- Chemical Engineering as a career path
- The Chemical Engineering program at KNUST
- CHEESA activities and events
- General chemical engineering concepts
- University life at KNUST

Be friendly, professional, and encouraging. If you don't know an answer, say so and suggest reaching out to CHEESA executives for more specific information.`;

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 1024,
};

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig,
});

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

// Helper function to send file
function sendFile(res, filePath, contentType) {
  const stream = createReadStream(filePath);
  
  stream.on('open', () => {
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
  });
  
  stream.on('error', (err) => {
    console.error('Error reading file:', err);
    res.statusCode = 404;
    res.end('Not Found');
  });
}

// Helper function to send JSON response
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(body);
}

// Helper function to read JSON from request
async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const ext = extname(pathname).toLowerCase();
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // API endpoint for chat
    if (req.method === 'POST' && pathname === '/api/chat') {
      try {
        const body = await readJson(req);
        const message = typeof body?.message === 'string' ? body.message : '';
        const conversationHistory = Array.isArray(body?.conversationHistory) 
          ? body.conversationHistory 
          : [];

        if (!message.trim()) {
          sendJson(res, 400, { error: 'Message is required' });
          return;
        }

        const chat = model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
            },
            {
              role: 'model',
              parts: [
                {
                  text: "I'm CHEEStron, your friendly Chemical Engineering assistant. How can I help you today?",
                },
              ],
            },
            ...conversationHistory.map((msg) => ({
              role: msg?.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(msg?.content ?? '') }],
            })),
          ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        sendJson(res, 200, { response: text });
      } catch (error) {
        console.error('Error:', error);
        sendJson(res, 500, { error: 'Internal server error', details: error.message });
      }
      return;
    }

    // Serve static files
    if (req.method === 'GET') {
      // Default to index.html if no file extension
      if (pathname === '/') pathname = '/index.html';
      
      // Get the file path
      let filePath = join(process.cwd(), 'public', pathname);
      
      // Check if file exists
      stat(filePath, (err, stats) => {
        if (err) {
          // If file not found, serve index.html for SPA routing
          if (err.code === 'ENOENT') {
            const indexPath = join(process.cwd(), 'public', 'index.html');
            return sendFile(res, indexPath, 'text/html');
          }
          
          console.error('Error getting file stats:', err);
          res.statusCode = 500;
          res.end('Internal Server Error');
          return;
        }
        
        // If it's a directory, serve index.html
        if (stats.isDirectory()) {
          const indexPath = join(filePath, 'index.html');
          return sendFile(res, indexPath, 'text/html');
        }
        
        // Serve the file with appropriate content type
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        sendFile(res, filePath, contentType);
      });
      
      return;
    }

    // If no route is matched, return 404
    res.statusCode = 404;
    res.end('Not Found');
  } catch (error) {
    console.error('Server error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`CHEESA Chatbot running on http://localhost:${port}`);
  console.log(`- Chat interface available at http://localhost:${port}`);
  console.log(`- API endpoint: POST http://localhost:${port}/api/chat`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
