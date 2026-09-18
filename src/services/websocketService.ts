import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Message, MessageType, WsMessagePayload, CallSignalPayload, CallSignalType, CallType } from '../types';
import { api } from './api';

export type OnMessageReceivedCallback = (message: Message) => void;
export type OnSeenCallback = (data: { conversationId: string; seenBy: string; timestamp: string }) => void;
export type OnPresenceCallback = (data: { userId: string; online: boolean; lastSeen?: string }) => void;
export type OnConversationDeletedCallback = (data: { conversationId: string }) => void;
export type OnCallSignalCallback = (signal: CallSignalPayload) => void;

class WebSocketService {
  private client: Client | null = null;
  private messageSubscription: StompSubscription | null = null;
  private currentUserId: string | null = null;
  private isConnecting: boolean = false;
  private isConnected: boolean = false;
  private directSocket: WebSocket | null = null;

  private messageListeners: Set<OnMessageReceivedCallback> = new Set();
  private seenListeners: Set<OnSeenCallback> = new Set();
  private presenceListeners: Set<OnPresenceCallback> = new Set();
  private deleteListeners: Set<OnConversationDeletedCallback> = new Set();
  private callSignalListeners: Set<OnCallSignalCallback> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private statusFeedListeners: Set<(payload: WsMessagePayload) => void> = new Set();

  connect(userId: string, token: string): void {
    if (this.isConnected && this.currentUserId === userId) {
      return;
    }

    this.currentUserId = userId;
    this.disconnect();
    this.isConnecting = true;

    // Resolve base WebSocket URL: strictly ensure no /api and ensure ends with /ws
    const envWs = (import.meta.env.VITE_WS_URL || '').trim();
    let baseWsUrl: string;

    if (typeof window !== 'undefined' && window.location) {
      const isLocalhostBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isEnvLocalhost = envWs.includes('localhost') || envWs.includes('127.0.0.1');

      if (envWs && (!isEnvLocalhost || isLocalhostBrowser)) {
        baseWsUrl = envWs.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
        baseWsUrl = baseWsUrl.replace(/\/api\/?ws\/?$/i, '/ws').replace(/\/api\/?$/i, '');
        baseWsUrl = baseWsUrl.replace(/\/+$/, '');
        if (!baseWsUrl.endsWith('/ws')) {
          baseWsUrl = `${baseWsUrl}/ws`;
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        baseWsUrl = `${protocol}//${host}/ws`;
      }
    } else if (envWs) {
      // Replace http/https with ws/wss
      baseWsUrl = envWs.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
      // Strip any accidental /api segment (e.g. /api/ws or /api)
      baseWsUrl = baseWsUrl.replace(/\/api\/?ws\/?$/i, '/ws').replace(/\/api\/?$/i, '');
      // Strip trailing slash
      baseWsUrl = baseWsUrl.replace(/\/+$/, '');
      if (!baseWsUrl.endsWith('/ws')) {
        baseWsUrl = `${baseWsUrl}/ws`;
      }
    } else {
      baseWsUrl = 'ws://localhost:3000/ws';
    }

    const brokerUrl = `${baseWsUrl}?token=${encodeURIComponent(token)}`;

    // Helper for direct WebSocket fallback if STOMP fails
    const tryDirectFallback = () => {
      if (!this.isConnected && !this.directSocket) {
        this.setupDirectWebSocketFallback(brokerUrl);
      }
    };

    // Initialize STOMP Client
    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        userId: userId,
      },
      debug: () => {
        // Silent in production
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.notifyStatus(true);
        this.subscribeToUserQueue(userId);
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus(false);
      },
      onStompError: (frame) => {
        console.warn('STOMP broker notice:', frame.headers['message']);
        tryDirectFallback();
      },
      onWebSocketClose: () => {
        this.isConnected = false;
        this.notifyStatus(false);
        tryDirectFallback();
      },
    });

    try {
      this.client.activate();
    } catch (e) {
      console.warn('STOMP activation error, setting up direct WebSocket fallback', e);
      this.setupDirectWebSocketFallback(brokerUrl);
    }
  }

  private setupDirectWebSocketFallback(wsUrlWithToken: string): void {
    try {
      this.directSocket = new WebSocket(wsUrlWithToken);
      this.directSocket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.notifyStatus(true);
      };
      this.directSocket.onmessage = (event) => {
        try {
          const data: WsMessagePayload = JSON.parse(event.data);
          this.handlePayload(data);
        } catch (err) {
          // not json
        }
      };
      this.directSocket.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      console.error('WebSocket connection failed', err);
    }
  }

  private subscribeToUserQueue(userId: string): void {
    if (!this.client || !this.isConnected) return;

    const destination = `/user/${userId}/queue/messages`;

    try {
      this.messageSubscription = this.client.subscribe(destination, (stompMessage: IMessage) => {
        try {
          const payload: WsMessagePayload = JSON.parse(stompMessage.body);
          this.handlePayload(payload);
        } catch (e) {
          console.error('Failed to parse STOMP message', e);
        }
      });
    } catch (e) {
      console.error('Subscription error', e);
    }
  }

  private handlePayload(payload: WsMessagePayload): void {
    if (!payload) return;

    if (payload.type === 'CHAT_MESSAGE' && payload.message) {
      this.messageListeners.forEach((fn) => fn(payload.message!));
    } else if (payload.type === 'MESSAGES_SEEN') {
      this.seenListeners.forEach((fn) =>
        fn({
          conversationId: payload.conversationId || '',
          seenBy: payload.receiverId || payload.userId || '',
          timestamp: new Date().toISOString(),
        })
      );
    } else if (payload.type === 'USER_PRESENCE' && payload.userId) {
      this.presenceListeners.forEach((fn) =>
        fn({
          userId: payload.userId!,
          online: !!payload.online,
          lastSeen: payload.lastSeen,
        })
      );
    } else if (payload.type === 'CONVERSATION_DELETED' && payload.conversationId) {
      this.deleteListeners.forEach((fn) => fn({ conversationId: payload.conversationId! }));
    } else if (payload.type === 'CALL_SIGNAL' && payload.signalType) {
      this.callSignalListeners.forEach((fn) => fn(payload as any as CallSignalPayload));
    } else if (
      payload.type === 'STATUS_CREATED' ||
      payload.type === 'STATUS_VIEWED' ||
      payload.type === 'STATUS_DELETED'
    ) {
      this.statusFeedListeners.forEach((fn) => fn(payload));
    } else if ((payload as any).content && (payload as any).senderId) {
      // Direct message object
      this.messageListeners.forEach((fn) => fn(payload as any as Message));
    }
  }

  sendMessage(message: {
    conversationId: string;
    receiverId: string;
    senderId: string;
    content: string;
    messageType?: MessageType;
    replyTo?: any;
  }): void {
    const payload = {
      conversationId: message.conversationId,
      receiverId: message.receiverId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType || 'TEXT',
      replyTo: message.replyTo || undefined,
      timestamp: new Date().toISOString(),
    };

    if (this.client && this.client.connected) {
      this.client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(payload),
      });
    } else if (this.directSocket && this.directSocket.readyState === WebSocket.OPEN) {
      this.directSocket.send(
        JSON.stringify({
          action: 'chat.send',
          ...payload,
        })
      );
    } else {
      console.warn('Cannot send message: WebSocket is disconnected');
    }
  }

  notifySeen(conversationId: string, senderId: string, receiverId: string): void {
    const payload = {
      conversationId,
      senderId,
      receiverId,
      timestamp: new Date().toISOString(),
    };

    if (this.client && this.client.connected) {
      this.client.publish({
        destination: '/app/chat.seen',
        body: JSON.stringify(payload),
      });
    } else if (this.directSocket && this.directSocket.readyState === WebSocket.OPEN) {
      this.directSocket.send(
        JSON.stringify({
          action: 'chat.seen',
          ...payload,
        })
      );
    }
  }

  sendCallSignal(signal: {
    signalType: CallSignalType;
    callId: string;
    targetUserId: string;
    senderId?: string;
    conversationId?: string;
    callType?: CallType;
    payload?: any;
    recordInChat?: boolean;
    durationSeconds?: number;
  }): void {
    const senderId = signal.senderId || this.currentUserId || '';
    const body = {
      ...signal,
      senderId,
    };

    let sent = false;

    if (this.client && this.client.connected) {
      try {
        this.client.publish({
          destination: '/app/call.signal',
          body: JSON.stringify(body),
        });
        sent = true;
      } catch (err) {
        console.warn('STOMP publish call signal failed', err);
      }
    }

    if (!sent && this.directSocket && this.directSocket.readyState === WebSocket.OPEN) {
      try {
        this.directSocket.send(
          JSON.stringify({
            action: 'call.signal',
            ...body,
          })
        );
        sent = true;
      } catch (err) {
        console.warn('Direct socket send call signal failed', err);
      }
    }

    if (!sent) {
      // Robust REST fallback so call signal is never dropped if WS is reconnecting
      api.post('/call/signal', body).catch((err) => {
        console.warn('REST call signal fallback also failed', err);
      });
    }
  }

  onCallSignal(callback: OnCallSignalCallback): () => void {
    this.callSignalListeners.add(callback);
    return () => this.callSignalListeners.delete(callback);
  }

  onMessageReceived(callback: OnMessageReceivedCallback): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  onSeen(callback: OnSeenCallback): () => void {
    this.seenListeners.add(callback);
    return () => this.seenListeners.delete(callback);
  }

  onPresence(callback: OnPresenceCallback): () => void {
    this.presenceListeners.add(callback);
    return () => this.presenceListeners.delete(callback);
  }

  onConversationDeleted(callback: OnConversationDeletedCallback): () => void {
    this.deleteListeners.add(callback);
    return () => this.deleteListeners.delete(callback);
  }

  onStatusFeedEvent(callback: (payload: WsMessagePayload) => void): () => void {
    this.statusFeedListeners.add(callback);
    return () => this.statusFeedListeners.delete(callback);
  }

  onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((fn) => fn(connected));
  }

  disconnect(): void {
    if (this.messageSubscription) {
      try {
        this.messageSubscription.unsubscribe();
      } catch (e) {
        // ignore
      }
      this.messageSubscription = null;
    }

    if (this.client) {
      try {
        this.client.deactivate();
      } catch (e) {
        // ignore
      }
      this.client = null;
    }

    if (this.directSocket) {
      try {
        this.directSocket.close();
      } catch (e) {
        // ignore
      }
      this.directSocket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.notifyStatus(false);
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const websocketService = new WebSocketService();
