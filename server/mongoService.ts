import { MongoClient, Db, Collection } from 'mongodb';
import bcrypt from 'bcryptjs';
import {
  DbUser,
  DbConversation,
  DbMessage,
  DbFriendRequest,
  DbFriendship,
  DbCallHistory,
  DbStatus,
  DbSticker,
} from './types';

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

export interface MongoCollections {
  users: Collection<DbUser>;
  conversations: Collection<DbConversation>;
  messages: Collection<DbMessage>;
  friendRequests: Collection<DbFriendRequest>;
  friendships: Collection<DbFriendship>;
  callHistory: Collection<DbCallHistory>;
  statuses: Collection<DbStatus>;
  stickers: Collection<DbSticker>;
}

let collections: MongoCollections | null = null;
let initPromise: Promise<MongoCollections | null> | null = null;

/**
 * Initializes the MongoDB Atlas connection as a singleton.
 * MongoDB Atlas is the ONLY persistent database/storage for SimpleChat.
 */
export async function initMongo(): Promise<MongoCollections | null> {
  if (collections && mongoDb) {
    return collections;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const mongoUri = process.env.MONGODB_URI?.trim();

    if (!mongoUri) {
      console.warn(
        '[System] MONGODB_URI environment variable is not configured. MongoDB Atlas is the single source of truth for persistent data in SimpleChat.'
      );
      return null;
    }

    console.log('[System] Connecting to MongoDB Atlas...');

    // Mask URI for safe logging
    try {
      const parsed = new URL(mongoUri);
      const safeHost = parsed.hostname || 'cluster';
      console.log(`[System] Target MongoDB Atlas host: ${safeHost}`);
    } catch {
      // Ignore URL parsing errors for non-standard connection strings
    }

    try {
      mongoClient = new MongoClient(mongoUri, {
        maxPoolSize: 20,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      await mongoClient.connect();
      console.log('[System] Connected to MongoDB Atlas successfully.');

      mongoDb = mongoClient.db('simplechat');

      collections = {
        users: mongoDb.collection<DbUser>('users'),
        conversations: mongoDb.collection<DbConversation>('conversations'),
        messages: mongoDb.collection<DbMessage>('messages'),
        friendRequests: mongoDb.collection<DbFriendRequest>('friend_requests'),
        friendships: mongoDb.collection<DbFriendship>('friendships'),
        callHistory: mongoDb.collection<DbCallHistory>('call_history'),
        statuses: mongoDb.collection<DbStatus>('statuses'),
        stickers: mongoDb.collection<DbSticker>('stickers'),
      };

      // Ensure MongoDB Atlas indexes for uniqueness, referential integrity, and fast queries
      try {
        await Promise.all([
          collections.users.createIndex({ id: 1 }, { unique: true }),
          collections.users.createIndex({ username: 1 }, { unique: true }),
          collections.users.createIndex({ email: 1 }, { unique: true }),
          collections.conversations.createIndex({ id: 1 }, { unique: true }),
          collections.conversations.createIndex({ participantIds: 1 }),
          collections.messages.createIndex({ id: 1 }, { unique: true }),
          collections.messages.createIndex({ conversationId: 1, timestamp: 1 }),
          collections.friendRequests.createIndex({ id: 1 }, { unique: true }),
          collections.friendRequests.createIndex({ senderId: 1, receiverId: 1 }),
          collections.friendRequests.createIndex({ receiverId: 1, status: 1 }),
          collections.friendships.createIndex({ id: 1 }, { unique: true }),
          collections.friendships.createIndex({ user1Id: 1, user2Id: 1 }),
          collections.callHistory.createIndex({ id: 1 }, { unique: true }),
          collections.callHistory.createIndex({ callerId: 1 }),
          collections.callHistory.createIndex({ receiverId: 1 }),
          collections.callHistory.createIndex({ conversationId: 1, createdAt: -1 }),
          collections.statuses.createIndex({ id: 1 }, { unique: true }),
          collections.statuses.createIndex({ userId: 1, expiresAt: 1 }),
          collections.stickers.createIndex({ id: 1 }, { unique: true }),
          collections.stickers.createIndex({ packId: 1 }),
        ]);
      } catch (idxErr: any) {
        console.warn('[System] Notice during MongoDB index verification:', idxErr?.message || '');
      }

      // Seed default demo users, conversations, and records into MongoDB Atlas if users collection is empty
      await seedMongoIfEmpty(collections);

      return collections;
    } catch (connErr: any) {
      console.error('[System] Failed to connect to MongoDB Atlas:', connErr?.message || connErr);
      return null;
    }
  })();

  try {
    const cols = await initPromise;
    return cols;
  } catch (err) {
    initPromise = null; // Allow retry on subsequent calls
    return null;
  }
}

/**
 * Seeds initial demo data ONLY when the users collection in MongoDB Atlas is empty.
 * Never overwrites existing user data.
 */
async function seedMongoIfEmpty(cols: MongoCollections): Promise<void> {
  try {
    const userCount = await cols.users.countDocuments();
    if (userCount > 0) {
      return;
    }

    console.log('[System] Users collection in MongoDB Atlas is empty. Seeding initial demo data...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date().toISOString();

    const defaultUsers: DbUser[] = [
      {
        id: 'usr_rahul',
        name: 'Rahul Sharma',
        username: 'rahul',
        email: 'rahul@example.com',
        password: passwordHash,
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        about: 'Hey there! I am using SimpleChat',
        online: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        createdAt: now,
      },
      {
        id: 'usr_aman',
        name: 'Aman Verma',
        username: 'aman',
        email: 'aman@example.com',
        password: passwordHash,
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        about: 'Available for work and discussions',
        online: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        createdAt: now,
      },
      {
        id: 'usr_priya',
        name: 'Priya Patel',
        username: 'priya',
        email: 'priya@example.com',
        password: passwordHash,
        profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        about: 'Working on beautiful designs ✨',
        online: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        createdAt: now,
      },
    ];

    for (const u of defaultUsers) {
      const exists = await cols.users.findOne({ $or: [{ id: u.id }, { username: u.username }, { email: u.email }] });
      if (!exists) {
        await cols.users.insertOne(u);
      }
    }

    // Initial friendships
    const defaultFriendships: DbFriendship[] = [
      { id: 'fnd_1', user1Id: 'usr_rahul', user2Id: 'usr_priya', createdAt: now },
      { id: 'fnd_2', user1Id: 'usr_rahul', user2Id: 'usr_aman', createdAt: now },
      { id: 'fnd_3', user1Id: 'usr_priya', user2Id: 'usr_aman', createdAt: now },
    ];
    for (const f of defaultFriendships) {
      const exists = await cols.friendships.findOne({ id: f.id });
      if (!exists) {
        await cols.friendships.insertOne(f);
      }
    }

    // Initial conversation
    const convId = 'conv_demo_1';
    const existingConv = await cols.conversations.findOne({ id: convId });
    if (!existingConv) {
      await cols.conversations.insertOne({
        id: convId,
        participantIds: ['usr_rahul', 'usr_priya'],
        createdAt: now,
        updatedAt: now,
      });
    }

    // Initial message
    const msgId = 'msg_demo_1';
    const existingMsg = await cols.messages.findOne({ id: msgId });
    if (!existingMsg) {
      await cols.messages.insertOne({
        id: msgId,
        conversationId: convId,
        senderId: 'usr_rahul',
        receiverId: 'usr_priya',
        content: 'Welcome to SimpleChat powered by MongoDB Atlas! 🚀',
        messageType: 'TEXT',
        timestamp: now,
        delivered: true,
        seen: true,
      });
    }

    // Initial statuses
    const nowMs = Date.now();
    const expires24h = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
    const defaultStatuses: DbStatus[] = [
      {
        id: 'status_priya_1',
        userId: 'usr_priya',
        type: 'TEXT',
        content: 'Designing new themes for SimpleChat! ✨🎨',
        backgroundColor: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
        fontStyle: 'sans',
        createdAt: new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: expires24h,
        viewers: [],
      },
      {
        id: 'status_aman_1',
        userId: 'usr_aman',
        type: 'TEXT',
        content: 'Coffee & coding session ☕💻\nReal-time chatting with MongoDB Atlas!',
        backgroundColor: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        fontStyle: 'sans',
        createdAt: new Date(nowMs - 45 * 60 * 1000).toISOString(),
        expiresAt: expires24h,
        viewers: [],
      },
    ];
    for (const st of defaultStatuses) {
      const exists = await cols.statuses.findOne({ id: st.id });
      if (!exists) {
        await cols.statuses.insertOne(st);
      }
    }

    // Initial custom stickers in MongoDB Atlas
    const defaultCustomStickers: DbSticker[] = [
      {
        id: 'custom_default_star',
        packId: 'custom',
        title: 'Super Star',
        badgeText: 'YOU ROCK!',
        color: '#059669',
        accentColor: '#d1fae5',
        emoji: '⭐',
        subtext: 'Custom made',
        createdAt: now,
      },
      {
        id: 'custom_default_fire',
        packId: 'custom',
        title: 'On Fire',
        badgeText: 'LIT!',
        color: '#ea580c',
        accentColor: '#ffedd5',
        emoji: '🔥',
        subtext: 'Custom made',
        createdAt: now,
      },
    ];
    for (const stick of defaultCustomStickers) {
      const exists = await cols.stickers.findOne({ id: stick.id });
      if (!exists) {
        await cols.stickers.insertOne(stick);
      }
    }

    console.log('[System] MongoDB Atlas demo seed completed.');
  } catch (err: any) {
    console.warn('[System] Notice during MongoDB Atlas demo seed:', err?.message || err);
  }
}

export function getMongoDb(): Db | null {
  return mongoDb;
}

export function getCollections(): MongoCollections | null {
  return collections;
}

export function isMongoConnected(): boolean {
  return collections !== null && mongoDb !== null;
}
