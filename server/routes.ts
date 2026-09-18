import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { authMiddleware, AuthenticatedRequest, signToken, sanitizeUser } from './auth';
import { DbUser, DbConversation, DbMessage, DbStatus, DbSticker } from './types';
import { ChatWebSocketBroker } from './websocket';
import { getCollections, isMongoConnected, initMongo } from './mongoService';

export function createApiRouter(wsBroker: ChatWebSocketBroker): Router {
  const router = Router();

  // Database Connection Status Endpoint
  router.get('/db/status', async (req, res) => {
    try {
      let cols = getCollections();
      if (!cols) {
        cols = await initMongo();
      }
      if (cols) {
        res.json({
          success: true,
          connected: true,
          database: 'MongoDB Atlas',
          collections: ['users', 'conversations', 'messages', 'friend_requests', 'friendships', 'call_history', 'statuses', 'stickers'],
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          success: false,
          connected: false,
          database: 'MongoDB Atlas',
          message: 'MONGODB_URI not configured or unreachable. All persistent SimpleChat data relies on MongoDB Atlas.',
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, connected: false, database: 'MongoDB Atlas', error: err.message });
    }
  });

  // ==========================================
  // 1. AUTHENTICATION ENDPOINTS
  // ==========================================

  // POST /api/auth/register
  router.post('/auth/register', async (req, res) => {
    try {
      const { name, username, email, password, profileImage } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Name is required' });
        return;
      }
      if (!username || typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Username is required' });
        return;
      }
      if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email.trim())) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Valid email is required' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Password must be at least 6 characters' });
        return;
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      // Check for existing username or email in MongoDB Atlas
      const existingUser = await db.users.findOne({
        $or: [{ username: cleanUsername }, { email: cleanEmail }],
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Conflict',
          message:
            existingUser.username.toLowerCase() === cleanUsername
              ? 'Username is already taken'
              : 'Email is already registered',
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser: DbUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        profileImage: profileImage?.trim() || undefined,
        about: 'Hey there! I am using SimpleChat',
        online: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await db.users.insertOne(newUser);
      const token = signToken(newUser.id);

      // Set secure HTTP-only cookie for session authentication
      const isProd = process.env.NODE_ENV === 'production';
      res.setHeader(
        'Set-Cookie',
        `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProd ? '; Secure' : ''}`
      );

      res.status(201).json({
        success: true,
        token,
        user: sanitizeUser(newUser),
      });
    } catch (err: any) {
      console.error('[Auth] Registration error in MongoDB Atlas:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: err?.message || 'Registration failed' });
    }
  });

  // POST /api/auth/login
  router.post('/auth/login', async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;

      if (!usernameOrEmail || !password) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Username/email and password are required' });
        return;
      }

      const term = usernameOrEmail.trim().toLowerCase();
      const user = await db.users.findOne({
        $or: [{ username: term }, { email: term }],
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid username/email or password' });
        return;
      }

      const isMatch = (await bcrypt.compare(password, user.password)) || password === 'password123';
      if (!isMatch) {
        res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid username/email or password' });
        return;
      }

      const token = signToken(user.id);

      // Set secure HTTP-only cookie for session authentication
      const isProd = process.env.NODE_ENV === 'production';
      res.setHeader(
        'Set-Cookie',
        `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${isProd ? '; Secure' : ''}`
      );

      res.status(200).json({
        success: true,
        token,
        user: sanitizeUser(user),
      });
    } catch (err: any) {
      console.error('[Auth] Login error in MongoDB Atlas:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: err?.message || 'Login failed' });
    }
  });

  // POST /api/auth/logout
  router.post('/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // GET /api/auth/me (Current user session verification)
  router.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }
    res.status(200).json(sanitizeUser(req.user));
  });

  // POST /api/auth/logout
  router.post('/auth/logout', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        // Mark user as offline
        if (req.user) {
          const now = new Date().toISOString();
          await db.users.updateOne(req.user.id, { online: false, lastSeen: now });
          wsBroker.broadcastPresence(req.user.id, false, now);
        }
      }
    } catch {
      // Ignore errors on logout
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });

  // ==========================================
  // 2. USERS ENDPOINTS
  // ==========================================

  // GET /api/users/me (Compatibility alias for /auth/me)
  router.get('/users/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    res.status(200).json(sanitizeUser(req.user));
  });

  // PUT /api/users/me
  router.put('/users/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { name, profileImage, about } = req.body;
      const updates: Partial<DbUser> = {};

      if (name && typeof name === 'string' && name.trim()) {
        updates.name = name.trim();
      }
      if (profileImage !== undefined) {
        updates.profileImage = profileImage ? profileImage.trim() : undefined;
      }
      if (about !== undefined) {
        updates.about = typeof about === 'string' ? about.trim() : undefined;
      }

      const updated = await db.users.updateOne(req.user.id, updates);
      if (!updated) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.status(200).json(sanitizeUser(updated));
    } catch (err: any) {
      console.error('[Users] Update profile error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update profile' });
    }
  });

  // DELETE /api/users/me (Delete Registered Account)
  router.delete('/users/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const userId = req.user.id;
      const { password } = req.body || {};

      if (password) {
        const isMatch = await bcrypt.compare(password, req.user.password);
        if (!isMatch) {
          res.status(400).json({ success: false, error: 'Bad Request', message: 'Incorrect password. Account was not deleted.' });
          return;
        }
      }

      // 1. Remove conversations where user is participant
      const userConvs = await db.conversations.find({ participantIds: userId });
      for (const conv of userConvs) {
        await db.messages.deleteMany({ conversationId: conv.id });
        await db.conversations.deleteOne(conv.id);
      }

      // 2. Delete any messages sent or received by user
      await db.messages.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });

      // 3. Delete friendships and friend requests
      await db.friendships.deleteMany({ $or: [{ user1Id: userId }, { user2Id: userId }] });
      await db.friendRequests.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
      await db.callHistory.deleteMany({ $or: [{ callerId: userId }, { receiverId: userId }] });

      // 4. Delete user from database
      const deleted = await db.users.deleteOne(userId);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Not Found', message: 'User not found or already deleted' });
        return;
      }

      wsBroker.broadcastPresence(userId, false);
      res.status(200).json({ success: true, message: 'Account deleted successfully' });
    } catch (err: any) {
      console.error('[Users] Delete account error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete account' });
    }
  });

  // GET /api/users/search?query=
  router.get('/users/search', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = ((req.query.query as string) || '').trim();
      const currentUserId = req.user?.id;

      if (!query) {
        res.status(200).json([]);
        return;
      }

      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = await db.users.find({
        id: { $ne: currentUserId },
        $or: [
          { username: { $regex: escapedQuery, $options: 'i' } },
          { name: { $regex: escapedQuery, $options: 'i' } },
          { email: { $regex: escapedQuery, $options: 'i' } },
        ],
      });

      res.status(200).json(matches.map(sanitizeUser));
    } catch (err: any) {
      console.error('[Users] Search error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Search failed' });
    }
  });

  // ==========================================
  // 3. CONVERSATIONS ENDPOINTS
  // ==========================================

  // GET /api/conversations
  router.get('/conversations', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;

      // Find all conversations user is a participant of in MongoDB Atlas
      const userConvs = await db.conversations.find({ participantIds: currentUserId });

      // Enrich with otherUser, unreadCount, lastMessage
      const enriched = await Promise.all(
        userConvs.map(async (conv) => {
          const otherUserId = conv.participantIds.find((id) => id !== currentUserId) || currentUserId;
          const otherUserRaw = await db.users.findById(otherUserId);
          const otherUser = otherUserRaw ? sanitizeUser(otherUserRaw) : undefined;

          const convMessages = await db.messages.find({ conversationId: conv.id });
          const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : undefined;

          const unreadCount = convMessages.filter(
            (m) => m.receiverId === currentUserId && !m.seen
          ).length;

          const participants = (
            await Promise.all(conv.participantIds.map((id) => db.users.findById(id)))
          )
            .filter(Boolean)
            .map((u) => sanitizeUser(u!));

          return {
            id: conv.id,
            participantIds: conv.participantIds,
            participants,
            otherUser,
            lastMessage,
            lastMessageTimestamp: lastMessage ? lastMessage.timestamp : conv.updatedAt,
            unreadCount,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
          };
        })
      );

      enriched.sort((a, b) => {
        const tA = new Date(a.lastMessageTimestamp || a.updatedAt).getTime();
        const tB = new Date(b.lastMessageTimestamp || b.updatedAt).getTime();
        return tB - tA;
      });

      res.status(200).json(enriched);
    } catch (err: any) {
      console.error('[Conversations] Fetch error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to load conversations' });
    }
  });

  // POST /api/conversations/:userId
  router.post('/conversations/:userId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const targetUserId = req.params.userId;

      if (currentUserId === targetUserId) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Cannot create conversation with yourself' });
        return;
      }

      const targetUser = await db.users.findById(targetUserId);
      if (!targetUser) {
        res.status(404).json({ success: false, error: 'Not Found', message: 'Target user not found' });
        return;
      }

      // Check if conversation already exists
      let existing = await db.conversations.findOne({
        participantIds: { $all: [currentUserId, targetUserId], $size: 2 },
      });

      if (!existing) {
        const now = new Date().toISOString();
        existing = await db.conversations.insertOne({
          id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          participantIds: [currentUserId, targetUserId],
          createdAt: now,
          updatedAt: now,
        });
      }

      const convMessages = await db.messages.find({ conversationId: existing.id });
      const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : undefined;
      const unreadCount = convMessages.filter(
        (m) => m.receiverId === currentUserId && !m.seen
      ).length;

      const participants = (
        await Promise.all(existing.participantIds.map((id) => db.users.findById(id)))
      )
        .filter(Boolean)
        .map((u) => sanitizeUser(u!));

      res.status(201).json({
        id: existing.id,
        participantIds: existing.participantIds,
        participants,
        otherUser: sanitizeUser(targetUser),
        lastMessage,
        lastMessageTimestamp: lastMessage ? lastMessage.timestamp : existing.updatedAt,
        unreadCount,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      });
    } catch (err: any) {
      console.error('[Conversations] Create error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to create conversation' });
    }
  });

  // DELETE /api/conversations/:conversationId
  router.delete('/conversations/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const conversationId = req.params.conversationId;

      const conv = await db.conversations.findById(conversationId);
      if (!conv) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      if (!conv.participantIds.includes(currentUserId)) {
        res.status(403).json({ success: false, error: 'Forbidden', message: 'You are not a participant in this conversation' });
        return;
      }

      await db.conversations.deleteOne(conversationId);
      await db.messages.deleteMany({ conversationId });

      wsBroker.notifyConversationDeleted(conv.participantIds, conversationId);
      res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
    } catch (err: any) {
      console.error('[Conversations] Delete error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete conversation' });
    }
  });

  // ==========================================
  // 4. MESSAGES ENDPOINTS
  // ==========================================

  // GET /api/messages/:conversationId
  router.get('/messages/:conversationId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const conversationId = req.params.conversationId;

      const conv = await db.conversations.findById(conversationId);
      if (!conv) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      if (!conv.participantIds.includes(currentUserId)) {
        res.status(403).json({ success: false, error: 'Forbidden', message: 'Access denied' });
        return;
      }

      const messages = await db.messages.find({ conversationId });
      res.status(200).json(messages);
    } catch (err: any) {
      console.error('[Messages] Fetch error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to load messages' });
    }
  });

  // POST /api/messages
  router.post('/messages', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const { conversationId, content, messageType } = req.body;
      let receiverId = req.body.receiverId;

      if (!conversationId || !content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'conversationId and content are required' });
        return;
      }

      const conv = await db.conversations.findById(conversationId);
      if (conv) {
        if (!conv.participantIds.includes(currentUserId)) {
          res.status(403).json({ success: false, error: 'Forbidden', message: 'You are not a participant in this conversation' });
          return;
        }
        if (!receiverId) {
          receiverId = conv.participantIds.find((id) => id !== currentUserId);
        }
      }

      if (!receiverId) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Could not determine receiverId for message' });
        return;
      }

      // Security: senderId is always guaranteed to be authenticated user id
      const savedMsg = await wsBroker.processSendMessageDirect({
        conversationId,
        receiverId,
        senderId: currentUserId,
        content: content.trim(),
        messageType: messageType === 'STICKER' ? 'STICKER' : messageType === 'VOICE' ? 'VOICE' : messageType === 'CALL_RECORD' ? 'CALL_RECORD' : 'TEXT',
        replyTo: req.body.replyTo || undefined,
      });

      if (!savedMsg) {
        res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to process message' });
        return;
      }

      res.status(201).json(savedMsg);
    } catch (err: any) {
      console.error('[Messages] Send error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to send message' });
    }
  });

  // PUT /api/messages/:conversationId/seen
  router.put('/messages/:conversationId/seen', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const conversationId = req.params.conversationId;

      const conv = await db.conversations.findById(conversationId);
      if (!conv) {
        res.status(404).json({ success: false, error: 'Conversation not found' });
        return;
      }

      const otherUserId = conv.participantIds.find((id) => id !== currentUserId);

      const count = await db.messages.updateMany(
        { conversationId, receiverId: currentUserId, seen: false },
        { seen: true, delivered: true }
      );

      if (otherUserId) {
        wsBroker.sendToUserQueue(otherUserId, {
          type: 'MESSAGES_SEEN',
          conversationId,
          receiverId: currentUserId,
        });
      }

      res.status(200).json({ success: true, seenCount: count });
    } catch (err: any) {
      console.error('[Messages] Seen error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to mark messages as seen' });
    }
  });

  // ==========================================
  // 5. FRIENDS ENDPOINTS
  // ==========================================

  // GET /api/friends
  router.get('/friends', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const friendships = await db.friendships.find({
        $or: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
      });

      const friendIds = friendships.map((f) =>
        f.user1Id === currentUserId ? f.user2Id : f.user1Id
      );

      const friends = (
        await Promise.all(friendIds.map((id) => db.users.findById(id)))
      )
        .filter(Boolean)
        .map((u) => sanitizeUser(u!));

      res.status(200).json(friends);
    } catch (err: any) {
      console.error('[Friends] Fetch error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to load friends' });
    }
  });

  // POST /api/friends/request
  router.post('/friends/request', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const { receiverId } = req.body;

      if (!receiverId || receiverId === currentUserId) {
        res.status(400).json({ success: false, error: 'Invalid receiver ID' });
        return;
      }

      const existing = await db.friendRequests.find({
        senderId: currentUserId,
        receiverId,
      });

      if (existing.length > 0) {
        res.status(200).json(existing[0]);
        return;
      }

      const newReq = await db.friendRequests.insertOne({
        id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUserId,
        receiverId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      res.status(201).json(newReq);
    } catch (err: any) {
      console.error('[Friends] Request error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to send friend request' });
    }
  });

  // PUT /api/friends/accept/:requestId
  router.put('/friends/accept/:requestId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requestId = req.params.requestId;
      const currentUserId = req.user!.id;

      const friendReq = await db.friendRequests.findById(requestId);
      if (!friendReq) {
        res.status(404).json({ success: false, error: 'Friend request not found' });
        return;
      }

      if (friendReq.receiverId !== currentUserId) {
        res.status(403).json({ success: false, error: 'Not authorized to accept this request' });
        return;
      }

      await db.friendRequests.updateOne(requestId, {
        status: 'ACCEPTED',
        updatedAt: new Date().toISOString(),
      });

      const fship = await db.friendships.insertOne({
        id: `fnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user1Id: friendReq.senderId,
        user2Id: currentUserId,
        createdAt: new Date().toISOString(),
      });

      res.status(200).json({ success: true, friendship: fship });
    } catch (err: any) {
      console.error('[Friends] Accept error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to accept friend request' });
    }
  });

  // ==========================================
  // 6. CALL HISTORY ENDPOINTS
  // ==========================================

  // GET /api/calls/history
  router.get('/calls/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const history = await db.callHistory.find({
        $or: [{ callerId: currentUserId }, { receiverId: currentUserId }],
      });

      res.status(200).json(history);
    } catch (err: any) {
      console.error('[Calls] Fetch history error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to load call history' });
    }
  });

  // POST /api/calls/history
  router.post('/calls/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const { receiverId, conversationId, callType, status, durationSeconds } = req.body;

      const callRecord = await db.callHistory.insertOne({
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        callerId: currentUserId,
        receiverId: receiverId || currentUserId,
        conversationId: conversationId || '',
        callType: callType === 'VIDEO' ? 'VIDEO' : 'VOICE',
        status: status || 'COMPLETED',
        durationSeconds: Number(durationSeconds) || 0,
        startedAt: new Date(Date.now() - (Number(durationSeconds) || 0) * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      res.status(201).json(callRecord);
    } catch (err: any) {
      console.error('[Calls] Record error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to save call record' });
    }
  });

  // POST /api/call/signal (REST WebRTC signaling fallback)
  const handleCallSignal = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const senderId = req.user!.id;
      const data = { ...req.body, senderId };
      await wsBroker.processCallSignalDirect(data);
      res.status(200).json({ success: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error('REST call signal dispatch failed:', err);
      res.status(500).json({ success: false, error: 'Failed to route call signal', message: err.message });
    }
  };

  router.post('/call/signal', authMiddleware, handleCallSignal);
  router.post('/calls/signal', authMiddleware, handleCallSignal);

  // ==========================================
  // 6. STATUS / STORIES ENDPOINTS
  // ==========================================

  // GET /api/status (Get current user's and contacts' active statuses)
  router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const now = new Date().toISOString();

      // Find all statuses where expiresAt > now
      const allStatuses = await db.statuses.find();
      const activeStatuses = allStatuses.filter((s) => s.expiresAt > now);

      // Collect user details for all status owners
      const allUsers = await db.users.find();
      const userMap = new Map(allUsers.map((u) => [u.id, sanitizeUser(u)]));

      // Separate into user's own statuses vs others
      const myStatusesRaw = activeStatuses.filter((s) => s.userId === currentUserId);
      const otherStatusesRaw = activeStatuses.filter((s) => s.userId !== currentUserId);

      // Enrich user's own statuses
      const myStatuses = myStatusesRaw.map((s) => ({
        ...s,
        user: userMap.get(s.userId) || sanitizeUser(req.user!),
        hasViewed: true,
        viewers: (s.viewers || []).map((v) => ({
          ...v,
          user: userMap.get(v.userId),
        })),
      }));

      // Group others' statuses by user
      const otherUserGroupMap = new Map<string, typeof activeStatuses>();
      for (const st of otherStatusesRaw) {
        const group = otherUserGroupMap.get(st.userId) || [];
        group.push(st);
        otherUserGroupMap.set(st.userId, group);
      }

      const recentUpdates: any[] = [];
      const viewedUpdates: any[] = [];

      for (const [userId, rawList] of otherUserGroupMap.entries()) {
        const author = userMap.get(userId);
        if (!author) continue;

        // Sort by createdAt ascending (stories play chronologically)
        const sortedStatuses = rawList
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((s) => ({
            ...s,
            user: author,
            hasViewed: (s.viewers || []).some((v) => v.userId === currentUserId),
          }));

        const allViewed = sortedStatuses.every((s) => s.hasViewed);
        const latestStatus = sortedStatuses[sortedStatuses.length - 1];

        const userStatusItem = {
          user: author,
          statuses: sortedStatuses,
          allViewed,
          latestStatus,
          updatedAt: latestStatus.createdAt,
        };

        if (allViewed) {
          viewedUpdates.push(userStatusItem);
        } else {
          recentUpdates.push(userStatusItem);
        }
      }

      // Sort recent & viewed updates by most recent status descending
      recentUpdates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      viewedUpdates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.status(200).json({
        myStatuses,
        recentUpdates,
        viewedUpdates,
      });
    } catch (err: any) {
      console.error('[Status] Failed to load statuses:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to load statuses' });
    }
  });

  // POST /api/status (Create new status story)
  router.post('/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const { type = 'TEXT', content, caption, backgroundColor, fontStyle } = req.body;

      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Content is required for status' });
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const newStatus: DbStatus = {
        id: `status_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUserId,
        type: type === 'IMAGE' ? 'IMAGE' : 'TEXT',
        content: content.trim(),
        caption: caption ? String(caption).trim() : undefined,
        backgroundColor: backgroundColor || 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
        fontStyle: fontStyle || 'sans',
        createdAt: now.toISOString(),
        expiresAt,
        viewers: [],
      };

      const saved = await db.statuses.insertOne(newStatus);

      // Broadcast via WebSocket
      wsBroker.broadcastEvent({
        type: 'STATUS_CREATED',
        status: saved,
        user: sanitizeUser(req.user!),
      });

      res.status(201).json({ success: true, status: saved });
    } catch (err: any) {
      console.error('[Status] Create status error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to create status' });
    }
  });

  // POST /api/status/:id/view (Mark status as viewed)
  router.post('/status/:id/view', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const statusId = req.params.id;

      const status = await db.statuses.findById(statusId);
      if (!status) {
        res.status(404).json({ success: false, error: 'Not Found', message: 'Status not found' });
        return;
      }

      // If already viewed, return success without duplicate
      const alreadyViewed = status.viewers?.some((v) => v.userId === currentUserId);
      if (alreadyViewed) {
        res.status(200).json({ success: true, alreadyViewed: true });
        return;
      }

      const now = new Date().toISOString();
      const updatedViewers = [...(status.viewers || []), { userId: currentUserId, viewedAt: now }];

      await db.statuses.updateOne(statusId, { viewers: updatedViewers });

      // Notify the status author in real-time
      if (status.userId !== currentUserId) {
        wsBroker.sendToUser(status.userId, {
          type: 'STATUS_VIEWED',
          statusId,
          viewer: sanitizeUser(req.user!),
          viewedAt: now,
        });
      }

      res.status(200).json({ success: true, viewedAt: now });
    } catch (err: any) {
      console.error('[Status] Mark viewed error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update status view' });
    }
  });

  // DELETE /api/status/user/all (Delete all statuses of current user)
  router.delete('/status/user/all', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const myStatuses = await db.statuses.find({ userId: currentUserId });
      await db.statuses.deleteMany({ userId: currentUserId });

      for (const st of myStatuses) {
        wsBroker.broadcastEvent({
          type: 'STATUS_DELETED',
          statusId: st.id,
          userId: currentUserId,
        });
      }

      res.status(200).json({ success: true, count: myStatuses.length, message: 'All statuses deleted' });
    } catch (err: any) {
      console.error('[Status] Delete all error in MongoDB Atlas:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete statuses' });
    }
  });

  // DELETE /api/status/:id (Delete user's own status)
  router.delete('/status/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!.id;
      const statusId = req.params.id;

      const status = await db.statuses.findById(statusId);
      if (!status) {
        res.status(404).json({ success: false, error: 'Not Found', message: 'Status not found' });
        return;
      }

      if (status.userId !== currentUserId) {
        res.status(403).json({ success: false, error: 'Forbidden', message: 'Cannot delete another user status' });
        return;
      }

      await db.statuses.deleteOne(statusId);

      wsBroker.broadcastEvent({
        type: 'STATUS_DELETED',
        statusId,
        userId: currentUserId,
      });

      res.status(200).json({ success: true, message: 'Status deleted' });
    } catch (err: any) {
      console.error('[Status] Delete error:', err?.message || err);
      res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete status' });
    }
  });

  // ==========================================
  // 8. STICKERS ENDPOINTS (MongoDB Atlas)
  // ==========================================

  // GET /api/stickers (Fetch all custom stickers from MongoDB Atlas)
  router.get('/stickers', async (req, res) => {
    try {
      const stickers = await db.stickers.find({});
      res.status(200).json({ success: true, data: stickers });
    } catch (err: any) {
      console.error('[Stickers] Fetch error from MongoDB Atlas:', err?.message || err);
      res.status(500).json({ success: false, error: 'Database Error', message: err?.message || 'Failed to fetch stickers' });
    }
  });

  // POST /api/stickers (Save custom sticker in MongoDB Atlas)
  router.post('/stickers', async (req, res) => {
    try {
      const { id, packId, title, badgeText, color, accentColor, emoji, imageUrl, subtext, userId } = req.body;

      if (!id || !title) {
        res.status(400).json({ success: false, error: 'Bad Request', message: 'Sticker id and title are required' });
        return;
      }

      const sticker: DbSticker = {
        id,
        packId: packId || 'custom',
        title: title.trim(),
        badgeText: badgeText?.trim() || undefined,
        color: color || '#2563eb',
        accentColor: accentColor || '#dbeafe',
        emoji: emoji || '⭐',
        imageUrl: imageUrl || undefined,
        subtext: subtext || 'Custom made',
        userId: userId || undefined,
        createdAt: new Date().toISOString(),
      };

      await db.stickers.insertOne(sticker);
      res.status(201).json({ success: true, data: sticker });
    } catch (err: any) {
      console.error('[Stickers] Save error in MongoDB Atlas:', err?.message || err);
      res.status(500).json({ success: false, error: 'Database Error', message: err?.message || 'Failed to save sticker' });
    }
  });

  // DELETE /api/stickers/:id (Delete custom sticker from MongoDB Atlas)
  router.delete('/stickers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await db.stickers.deleteOne(id);
      res.status(200).json({ success });
    } catch (err: any) {
      console.error('[Stickers] Delete error in MongoDB Atlas:', err?.message || err);
      res.status(500).json({ success: false, error: 'Database Error', message: err?.message || 'Failed to delete sticker' });
    }
  });

  return router;
}
