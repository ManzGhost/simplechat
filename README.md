# SimpleChat - Full-Stack Real-Time Chat Application

A complete, production-ready full-stack real-time Chat Application designed with a modern WhatsApp/Telegram-inspired user experience. SimpleChat features user authentication via JWT, private 1-on-1 messaging, persistent conversations, live online/offline presence tracking, voice/video call signaling, and message delivery/read receipts over WebSocket.

---

## Architecture

```
React + Vite Frontend
       ↓
Node.js + TypeScript Backend (Express + STOMP/WebSocket)
       ↓
MongoDB Atlas
```

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Motion.
- **Backend**: Node.js, Express, TypeScript, WebSocket Broker (`/ws`), BCrypt, JWT.
- **Database**: MongoDB Atlas via official MongoDB Node.js driver (singleton connection, indexed collections).

---

## Key Features

- **Authentication & Security**:
  - User registration with name, username, email, password, and optional avatar image.
  - Login via username or email with BCrypt password hashing.
  - JWT token generation and storage with automatic Axios bearer interceptor.
  - Unauthenticated route guards redirecting to `/login`.
- **User Discovery & Conversation Initiation**:
  - Live user search by username, name, or email (excluding current user).
  - One-click "Chat" initiation that either opens an existing thread or creates a new one.
- **Conversation Management**:
  - Sidebar showing avatar, participant name, online indicator, last message snippet, timestamp, and unread count badge.
  - Delete conversation action with confirmation dialog.
- **Chat Window**:
  - Header showing recipient details, live presence indicator, and call triggers.
  - Message bubble stream grouped with timestamps and sender/receiver distinction.
  - Real-time single check (Sent), double check (Delivered), and blue double check (Seen).
  - Auto-scroll to latest incoming and outgoing messages.
  - Rich sticker creator & instant photo/sticker attachments.
- **Voice & Video Calling**:
  - WebRTC calling with signaling over WebSocket and fallback REST API endpoints.
  - Persistent call history stored in MongoDB Atlas.

---

## Environment Variables

Configure these in your environment or `.env` file:

```env
# MongoDB Atlas connection string (required)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/simplechat?retryWrites=true&w=majority

# JWT secret key for token signing
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_here

# Port to bind (dynamically provided by Render or default 3000)
PORT=3000

# Optional frontend/backend URL override (defaults to relative /api and /ws for single-domain deployment)
# VITE_API_URL=https://your-domain.onrender.com/api
# VITE_WS_URL=wss://your-domain.onrender.com/ws
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The application will start on `http://0.0.0.0:3000`.

---

## Production Deployment (Render)

1. **Create Web Service** on Render connected to your Git repository.
2. **Environment**: Node
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI.
   - `JWT_SECRET`: A secure random string.
   - `NODE_ENV`: `production`

---

## API Endpoints

All protected endpoints require `Authorization: Bearer <token>`:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Authenticate user & get JWT
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout & update presence
- `GET /api/users/me` - Profile data
- `PUT /api/users/me` - Update display name & avatar
- `DELETE /api/users/me` - Delete account & wipe user data
- `GET /api/users/search?query=` - Search users by name/username/email
- `GET /api/conversations` - List conversations with last message & unread counts
- `POST /api/conversations/:userId` - Create or retrieve conversation
- `DELETE /api/conversations/:conversationId` - Delete conversation and messages
- `GET /api/messages/:conversationId` - Get message history
- `POST /api/messages` - Send message (text or sticker)
- `PUT /api/messages/:conversationId/seen` - Mark messages as seen
- `GET /api/friends` - List user's friends
- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/accept/:requestId` - Accept friend request
- `GET /api/calls/history` - Get voice/video call history
- `POST /api/calls/history` - Record call log
- `POST /api/call/signal` - WebRTC call signal REST fallback
- `GET /api/health` - Server health check
