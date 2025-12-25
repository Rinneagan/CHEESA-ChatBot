# CHEESA Chatbot API

A standalone API service for the CHEESA Chatbot, providing AI-powered responses for the Chemical Engineering Student Association (CHEESA) at KNUST.

## Features

- 🌐 RESTful API for chat interactions
- 🤖 Powered by Google's Generative AI
- 🔄 Supports conversation history
- ✅ Health check endpoint
- 🔒 CORS enabled
- 🚀 Easy to deploy

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google AI API key

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update with your configuration:
   ```bash
   cp .env.example .env
   ```
4. Update the environment variables in `.env`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|:--------:|:-------:|
| PORT | Port to run the server on | No | 3001 |
| GOOGLE_AI_KEY | Your Google AI API key | Yes | - |
| NODE_ENV | Environment (development/production) | No | development |

## Running Locally

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### POST /api/chat

Process a chat message and return the AI's response.

**Request Body:**
```json
{
  "message": "Your message here",
  "conversationHistory": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there! How can I help?"}
  ]
}
```

**Response:**
```json
{
  "message": "AI response here"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-25T00:00:00.000Z"
}
```

## Deployment

1. Set up a server with Node.js 18+
2. Clone the repository
3. Install dependencies: `npm install --production`
4. Configure environment variables
5. Start the server: `npm start`

For production, consider using PM2 or a similar process manager:

```bash
npm install -g pm2
pm2 start src/index.mjs --name "cheesa-chatbot"
```

## License

MIT
