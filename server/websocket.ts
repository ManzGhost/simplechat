import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { db } from './db';
import { verifyToken } from './auth';
import { DbMessage } from './types';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  subscriptions: Map<string, string>; // subId -> destination
}

export class ChatWebSocketBroker {
  private wss: WebSocketServer;
  private userSockets: Map<string, Set<ConnectedClient>> = new Map();
  private activeCalls: Map<string, { callId: string; callerId: string; calleeId: string; callType: 'voice' | 'video'; startTime: number }> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const pathname = url.parse(request.url || '').pathname;
      if (pathname === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleConnection(ws, request);
    });
  }

  private async handleConnection(ws: WebSocket, request: any): Promise<void> {
    const parsedUrl = url.parse(request.url || '', true);
    const tokenQuery = parsedUrl.query.token as string | undefined;
    const userIdQuery = parsedUrl.query.userId as string | undefined;

    let authenticatedUserId: string | null = null;

    if (tokenQuery && tokenQuery !== 'null' && tokenQuery !== 'undefined') {
      const decoded = verifyToken(tokenQuery);
      if (decoded?.sub || decoded?.id) {
        authenticatedUserId = (decoded.sub || decoded.id)!;
      }
    }

    if (!authenticatedUserId && userIdQuery) {
      try {
        const user = await db.users.findById(userIdQuery);
        if (user) authenticatedUserId = user.id;
      } catch (e) {
        // ignore
      }
    }

    const client: ConnectedClient = {
      ws,
      userId: authenticatedUserId || '',
      subscriptions: new Map(),
    };

    if (authenticatedUserId) {
      await this.registerUserConnection(authenticatedUserId, client);
    }

    ws.on('message', async (raw: Buffer | string) => {
      const text = raw.toString('utf-8');
      await this.handleIncomingMessage(client, text);
    });

    ws.on('close', async () => {
      await this.handleDisconnection(client);
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Client error:', err.message);
    });
  }

  private async registerUserConnection(userId: string, client: ConnectedClient): Promise<void> {
    client.userId = userId;
    let set = this.userSockets.get(userId);
    const wasOffline = !set || set.size === 0;

    if (!set) {
      set = new Set();
      this.userSockets.set(userId, set);
    }
    set.add(client);

    if (wasOffline) {
      try {
        await db.users.updateOne(userId, { online: true });
      } catch (err: any) {
        console.warn('[WebSocket] Could not update online status:', err.message);
      }
      this.broadcastPresence(userId, true);
    }
  }

  private async handleDisconnection(client: ConnectedClient): Promise<void> {
    const userId = client.userId;
    if (!userId) return;

    const set = this.userSockets.get(userId);
    if (set) {
      set.delete(client);
      if (set.size === 0) {
        this.userSockets.delete(userId);
        const lastSeen = new Date().toISOString();
        try {
          await db.users.updateOne(userId, { online: false, lastSeen });
        } catch (err: any) {
          console.warn('[WebSocket] Could not update offline status:', err.message);
        }
        this.broadcastPresence(userId, false, lastSeen);

        // Terminate any active calls involving this user
        for (const [callId, call] of this.activeCalls.entries()) {
          if (call.callerId === userId || call.calleeId === userId) {
            const peerId = call.callerId === userId ? call.calleeId : call.callerId;
            this.sendToUserQueue(peerId, {
              type: 'CALL_SIGNAL',
              signalType: 'HANGUP',
              callId,
              senderId: userId,
              targetUserId: peerId,
              payload: { reason: 'peer_disconnected' },
            });
            this.activeCalls.delete(callId);
          }
        }
      }
    }
  }

  private async handleIncomingMessage(client: ConnectedClient, text: string): Promise<void> {
    // Check if message is a STOMP frame
    if (text.startsWith('CONNECT') || text.startsWith('STOMP')) {
      await this.handleStompConnect(client, text);
      return;
    }

    if (text.startsWith('SUBSCRIBE')) {
      this.handleStompSubscribe(client, text);
      return;
    }

    if (text.startsWith('SEND')) {
      await this.handleStompSend(client, text);
      return;
    }

    if (text.startsWith('DISCONNECT')) {
      this.sendStompFrame(client.ws, 'RECEIPT', { 'receipt-id': 'disconnect' }, '');
      client.ws.close();
      return;
    }

    // Ping / heartbeat handling
    if (text === '\n' || text === '\r\n') {
      client.ws.send('\n');
      return;
    }

    // Try parsing as JSON for direct WebSocket fallback
    try {
      const json = JSON.parse(text);
      if (json.action === 'chat.send') {
        await this.processSendMessage(client, json);
      } else if (json.action === 'chat.seen') {
        await this.processSeenMessage(client, json);
      } else if (json.action === 'call.signal') {
        await this.processCallSignal(client, json);
      }
    } catch {
      // ignore non-JSON messages
    }
  }

  // --- STOMP Frame Parsers & Handlers ---

  private parseStompFrame(raw: string): { command: string; headers: Record<string, string>; body: string } {
    const lines = raw.split(/\r?\n/);
    const command = lines[0].trim();
    const headers: Record<string, string> = {};
    let i = 1;

    while (i < lines.length && lines[i] !== '') {
      const separatorIdx = lines[i].indexOf(':');
      if (separatorIdx !== -1) {
        const key = lines[i].substring(0, separatorIdx).trim();
        const value = lines[i].substring(separatorIdx + 1).trim();
        headers[key] = value;
      }
      i++;
    }

    i++;
    let body = lines.slice(i).join('\n');
    if (body.endsWith('\0')) {
      body = body.slice(0, -1);
    }

    return { command, headers, body };
  }

  private sendStompFrame(ws: WebSocket, command: string, headers: Record<string, string>, body: string = ''): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    let frame = `${command}\n`;
    for (const [k, v] of Object.entries(headers)) {
      frame += `${k}:${v}\n`;
    }
    frame += `\n${body}\0`;
    ws.send(frame);
  }

  private async handleStompConnect(client: ConnectedClient, text: string): Promise<void> {
    const { headers } = this.parseStompFrame(text);
    let userId = headers['userId'] || headers['login'];

    if (!userId && headers['Authorization']) {
      const token = headers['Authorization'].replace('Bearer ', '').trim();
      const decoded = verifyToken(token);
      if (decoded?.sub || decoded?.id) userId = (decoded.sub || decoded.id)!;
    }

    if (userId) {
      await this.registerUserConnection(userId, client);
    }

    this.sendStompFrame(
      client.ws,
      'CONNECTED',
      {
        version: '1.2',
        'heart-beat': '10000,10000',
        ...(client.userId ? { 'user-name': client.userId } : {}),
      },
      ''
    );
  }

  private handleStompSubscribe(client: ConnectedClient, text: string): void {
    const { headers } = this.parseStompFrame(text);
    const dest = headers['destination'];
    const id = headers['id'] || 'sub-0';

    if (dest) {
      client.subscriptions.set(id, dest);
      const userMatch = dest.match(/\/user\/([^/]+)\/queue/);
      if (userMatch && userMatch[1] && !client.userId) {
        this.registerUserConnection(userMatch[1], client);
      }
    }
  }

  private async handleStompSend(client: ConnectedClient, text: string): Promise<void> {
    const { headers, body } = this.parseStompFrame(text);
    const dest = headers['destination'];

    try {
      const payload = JSON.parse(body);
      if (dest === '/app/chat.send') {
        await this.processSendMessage(client, payload);
      } else if (dest === '/app/chat.seen') {
        await this.processSeenMessage(client, payload);
      } else if (dest === '/app/call.signal') {
        await this.processCallSignal(client, payload);
      }
    } catch (e) {
      console.error('[WebSocket] Failed to parse STOMP body:', e);
    }
  }

  // --- Call Signaling Processing ---

  public async processCallSignalDirect(data: any): Promise<void> {
    const dummyClient: ConnectedClient = {
      ws: null as any,
      userId: data.senderId || '',
      subscriptions: new Map(),
    };
    await this.processCallSignal(dummyClient, data);
  }

  private async processCallSignal(client: ConnectedClient, data: any): Promise<void> {
    const { signalType, callId, targetUserId } = data;
    const senderId = data.senderId || client.userId;

    if (!signalType || !callId || !targetUserId || !senderId) return;

    const callType = data.callType || data.payload?.callType || 'voice';

    if (signalType === 'OFFER') {
      const targetClients = this.userSockets.get(targetUserId);
      if (!targetClients || targetClients.size === 0) {
        this.sendToUserQueue(senderId, {
          type: 'CALL_SIGNAL',
          signalType: 'REJECT',
          senderId: targetUserId,
          targetUserId: senderId,
          callId,
          conversationId: data.conversationId,
          callType,
          payload: { reason: 'user_offline', message: 'User is currently offline' },
        });
        return;
      }

      const isTargetInCall = Array.from(this.activeCalls.values()).some(
        (c) => (c.callerId === targetUserId || c.calleeId === targetUserId) && c.callId !== callId
      );
      if (isTargetInCall) {
        this.sendToUserQueue(senderId, {
          type: 'CALL_SIGNAL',
          signalType: 'BUSY',
          senderId: targetUserId,
          targetUserId: senderId,
          callId,
          conversationId: data.conversationId,
          callType,
          payload: { reason: 'user_busy', message: 'User is busy on another call' },
        });
        return;
      }

      if (!data.payload) data.payload = {};
      if (!data.payload.caller) {
        const callerUser = await db.users.findById(senderId);
        if (callerUser) {
          data.payload.caller = {
            id: callerUser.id,
            name: callerUser.name,
            username: callerUser.username,
            email: callerUser.email,
            profileImage: callerUser.profileImage,
            online: true,
          };
        }
      }

      this.activeCalls.set(callId, {
        callId,
        callerId: senderId,
        calleeId: targetUserId,
        callType,
        startTime: Date.now(),
      });
    } else if (signalType === 'HANGUP' || signalType === 'REJECT' || signalType === 'BUSY') {
      const existingCall = this.activeCalls.get(callId);
      this.activeCalls.delete(callId);

      if (data.recordInChat && data.conversationId) {
        const now = new Date().toISOString();
        const durationSeconds = data.durationSeconds || 0;
        const callTypeLabel = (existingCall?.callType || callType) === 'video' ? 'Video' : 'Voice';
        let recordContent = '';

        if (signalType === 'HANGUP') {
          if (durationSeconds > 0) {
            const mins = Math.floor(durationSeconds / 60);
            const secs = durationSeconds % 60;
            const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            recordContent = `${callTypeLabel} call ended · ${timeStr}`;
          } else {
            recordContent = `${callTypeLabel} call ended`;
          }
        } else if (signalType === 'REJECT' || signalType === 'BUSY') {
          recordContent = `Missed ${callTypeLabel.toLowerCase()} call`;
        }

        if (recordContent) {
          const recordMsg: DbMessage = {
            id: `msg_call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            conversationId: data.conversationId,
            senderId,
            receiverId: targetUserId,
            content: recordContent,
            messageType: 'CALL_RECORD',
            timestamp: now,
            delivered: true,
            seen: false,
          };

          await db.messages.insertOne(recordMsg);
          await db.conversations.updateOne(data.conversationId, { updatedAt: now });

          await db.callHistory.insertOne({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            callerId: senderId,
            receiverId: targetUserId,
            conversationId: data.conversationId,
            callType: data.callType === 'VIDEO' ? 'VIDEO' : 'VOICE',
            status: data.signalType === 'REJECT' ? 'REJECTED' : 'COMPLETED',
            durationSeconds: data.durationSeconds || 0,
            startedAt: new Date(Date.now() - (data.durationSeconds || 0) * 1000).toISOString(),
            endedAt: now,
            createdAt: now,
          });

          const chatPayload = {
            type: 'CHAT_MESSAGE',
            message: recordMsg,
          };
          this.sendToUserQueue(targetUserId, chatPayload);
          this.sendToUserQueue(senderId, chatPayload);
        }
      }
    }

    this.sendToUserQueue(targetUserId, {
      type: 'CALL_SIGNAL',
      signalType,
      senderId,
      targetUserId,
      callId,
      conversationId: data.conversationId,
      callType,
      payload: data.payload,
    });
  }

  // --- Message and Presence Processing ---

  public async processSendMessageDirect(payload: any): Promise<DbMessage | null> {
    const { conversationId, receiverId, content, senderId } = payload;
    if (!conversationId || !receiverId || !senderId || !content) return null;

    let conversation = await db.conversations.findById(conversationId);
    if (!conversation) {
      conversation = await db.conversations.insertOne({
        id: conversationId,
        participantIds: [senderId, receiverId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const receiverSockets = this.userSockets.get(receiverId);
    const isReceiverOnline = !!(receiverSockets && receiverSockets.size > 0);

    const now = new Date().toISOString();
    const newMsg: DbMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      conversationId,
      senderId,
      receiverId,
      content: content.trim(),
      messageType: payload.messageType === 'STICKER' ? 'STICKER' : payload.messageType === 'VOICE' ? 'VOICE' : payload.messageType === 'CALL_RECORD' ? 'CALL_RECORD' : 'TEXT',
      timestamp: now,
      delivered: isReceiverOnline,
      seen: false,
      replyTo: payload.replyTo || undefined,
    };

    await db.messages.insertOne(newMsg);
    await db.conversations.updateOne(conversationId, { updatedAt: now });

    const wsPayload = {
      type: 'CHAT_MESSAGE',
      message: newMsg,
    };

    this.sendToUserQueue(receiverId, wsPayload);
    this.sendToUserQueue(senderId, wsPayload);

    return newMsg;
  }

  private async processSendMessage(client: ConnectedClient, payload: any): Promise<void> {
    const senderId = payload.senderId || client.userId;
    await this.processSendMessageDirect({ ...payload, senderId });
  }

  private async processSeenMessage(client: ConnectedClient, payload: any): Promise<void> {
    const { conversationId, senderId } = payload;
    const receiverId = payload.receiverId || client.userId;

    if (!conversationId || !senderId) return;

    await db.messages.updateMany(
      { conversationId, receiverId, seen: false },
      { seen: true, delivered: true }
    );

    const wsPayload = {
      type: 'MESSAGES_SEEN',
      conversationId,
      receiverId,
    };

    this.sendToUserQueue(senderId, wsPayload);
  }

  public notifyConversationDeleted(participantIds: string[], conversationId: string): void {
    const wsPayload = {
      type: 'CONVERSATION_DELETED',
      conversationId,
    };
    for (const pId of participantIds) {
      this.sendToUserQueue(pId, wsPayload);
    }
  }

  public sendToUserQueue(userId: string, payload: any): void {
    const clients = this.userSockets.get(userId);
    if (!clients || clients.size === 0) return;

    const jsonStr = JSON.stringify(payload);
    const destination = `/user/${userId}/queue/messages`;

    for (const client of clients) {
      if (!client.ws || client.ws.readyState !== WebSocket.OPEN) continue;

      let sentStomp = false;
      for (const [subId, subDest] of client.subscriptions.entries()) {
        if (
          subDest === destination ||
          subDest.includes(userId) ||
          subDest === '/user/queue/messages' ||
          subDest.startsWith('/user/')
        ) {
          this.sendStompFrame(
            client.ws,
            'MESSAGE',
            {
              destination: subDest,
              subscription: subId,
              'message-id': `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              'content-type': 'application/json',
            },
            jsonStr
          );
          sentStomp = true;
          break;
        }
      }

      if (!sentStomp && client.subscriptions.size > 0) {
        const [firstSubId, firstSubDest] = client.subscriptions.entries().next().value;
        this.sendStompFrame(
          client.ws,
          'MESSAGE',
          {
            destination: firstSubDest,
            subscription: firstSubId,
            'message-id': `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            'content-type': 'application/json',
          },
          jsonStr
        );
        sentStomp = true;
      }

      if (!sentStomp) {
        try {
          client.ws.send(jsonStr);
        } catch {
          // ignore
        }
      }
    }
  }

  public broadcastEvent(event: any): void {
    const payload = JSON.stringify(event);
    for (const clientSet of this.userSockets.values()) {
      for (const client of clientSet) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(payload);
          } catch {
            // ignore
          }
        }
      }
    }
  }

  public sendToUser(userId: string, event: any): void {
    const clientSet = this.userSockets.get(userId);
    if (!clientSet) return;
    const payload = JSON.stringify(event);
    for (const client of clientSet) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(payload);
        } catch {
          // ignore
        }
      }
    }
  }

  public broadcastPresence(userId: string, online: boolean, lastSeen?: string): void {
    const payload = JSON.stringify({
      type: 'USER_PRESENCE',
      userId,
      online,
      lastSeen,
    });

    for (const clientSet of this.userSockets.values()) {
      for (const client of clientSet) {
        if (client.ws.readyState === WebSocket.OPEN) {
          for (const [subId, subDest] of client.subscriptions.entries()) {
            this.sendStompFrame(
              client.ws,
              'MESSAGE',
              {
                destination: subDest,
                subscription: subId,
                'message-id': `presence-${Date.now()}`,
                'content-type': 'application/json',
              },
              payload
            );
          }
          try {
            client.ws.send(payload);
          } catch {
            // ignore
          }
        }
      }
    }
  }
}
