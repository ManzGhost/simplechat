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
import { getCollections, initMongo, MongoCollections } from './mongoService';

async function getRequiredCollections(): Promise<MongoCollections> {
  const existing = getCollections();
  if (existing) {
    return existing;
  }
  const initialized = await initMongo();
  if (!initialized) {
    throw new Error(
      'MongoDB Atlas connection required: Please ensure MONGODB_URI is provided in your environment settings. MongoDB Atlas is the single source of truth for persistent data in SimpleChat.'
    );
  }
  return initialized;
}

/**
 * MongoDB Atlas Persistent Database Access Layer.
 * MongoDB Atlas is the ONLY persistent database/storage for the entire SimpleChat application.
 * All operations execute directly against MongoDB Atlas collections.
 */
export const db = {
  users: {
    async find(filter: any = {}): Promise<DbUser[]> {
      const cols = await getRequiredCollections();
      return await cols.users.find(filter).toArray();
    },

    async findById(id: string): Promise<DbUser | null> {
      const cols = await getRequiredCollections();
      return await cols.users.findOne({ id } as any);
    },

    async findOne(filter: any): Promise<DbUser | null> {
      const cols = await getRequiredCollections();
      return await cols.users.findOne(filter);
    },

    async insertOne(user: DbUser): Promise<DbUser> {
      const cols = await getRequiredCollections();
      await cols.users.insertOne({ ...user });
      return user;
    },

    async updateOne(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
      const cols = await getRequiredCollections();
      const result = await cols.users.findOneAndUpdate(
        { id } as any,
        { $set: updates },
        { returnDocument: 'after' }
      );
      return result;
    },

    async deleteOne(id: string): Promise<boolean> {
      const cols = await getRequiredCollections();
      const res = await cols.users.deleteOne({ id } as any);
      return (res.deletedCount || 0) > 0;
    },
  },

  conversations: {
    async find(filter: any = {}): Promise<DbConversation[]> {
      const cols = await getRequiredCollections();
      return await cols.conversations.find(filter).sort({ updatedAt: -1 }).toArray();
    },

    async findById(id: string): Promise<DbConversation | null> {
      const cols = await getRequiredCollections();
      return await cols.conversations.findOne({ id } as any);
    },

    async findOne(filter: any): Promise<DbConversation | null> {
      const cols = await getRequiredCollections();
      return await cols.conversations.findOne(filter);
    },

    async insertOne(conv: DbConversation): Promise<DbConversation> {
      const cols = await getRequiredCollections();
      await cols.conversations.insertOne({ ...conv });
      return conv;
    },

    async updateOne(id: string, updates: Partial<DbConversation>): Promise<DbConversation | null> {
      const cols = await getRequiredCollections();
      const result = await cols.conversations.findOneAndUpdate(
        { id } as any,
        { $set: updates },
        { returnDocument: 'after' }
      );
      return result;
    },

    async deleteOne(id: string): Promise<boolean> {
      const cols = await getRequiredCollections();
      const res = await cols.conversations.deleteOne({ id } as any);
      return (res.deletedCount || 0) > 0;
    },
  },

  messages: {
    async find(filter: any = {}): Promise<DbMessage[]> {
      const cols = await getRequiredCollections();
      return await cols.messages.find(filter).sort({ timestamp: 1 }).toArray();
    },

    async findById(id: string): Promise<DbMessage | null> {
      const cols = await getRequiredCollections();
      return await cols.messages.findOne({ id } as any);
    },

    async insertOne(message: DbMessage): Promise<DbMessage> {
      const cols = await getRequiredCollections();
      await cols.messages.insertOne({ ...message });
      return message;
    },

    async updateMany(filter: any, updates: Partial<DbMessage>): Promise<number> {
      const cols = await getRequiredCollections();
      const res = await cols.messages.updateMany(filter, { $set: updates });
      return res.modifiedCount || 0;
    },

    async deleteMany(filter: any): Promise<number> {
      const cols = await getRequiredCollections();
      const res = await cols.messages.deleteMany(filter);
      return res.deletedCount || 0;
    },
  },

  friendRequests: {
    async find(filter: any = {}): Promise<DbFriendRequest[]> {
      const cols = await getRequiredCollections();
      return await cols.friendRequests.find(filter).sort({ createdAt: -1 }).toArray();
    },

    async findById(id: string): Promise<DbFriendRequest | null> {
      const cols = await getRequiredCollections();
      return await cols.friendRequests.findOne({ id } as any);
    },

    async insertOne(req: DbFriendRequest): Promise<DbFriendRequest> {
      const cols = await getRequiredCollections();
      await cols.friendRequests.insertOne({ ...req });
      return req;
    },

    async updateOne(id: string, updates: Partial<DbFriendRequest>): Promise<DbFriendRequest | null> {
      const cols = await getRequiredCollections();
      const result = await cols.friendRequests.findOneAndUpdate(
        { id } as any,
        { $set: updates },
        { returnDocument: 'after' }
      );
      return result;
    },

    async deleteMany(filter: any): Promise<number> {
      const cols = await getRequiredCollections();
      const res = await cols.friendRequests.deleteMany(filter);
      return res.deletedCount || 0;
    },
  },

  friendships: {
    async find(filter: any = {}): Promise<DbFriendship[]> {
      const cols = await getRequiredCollections();
      return await cols.friendships.find(filter).toArray();
    },

    async insertOne(fship: DbFriendship): Promise<DbFriendship> {
      const cols = await getRequiredCollections();
      await cols.friendships.insertOne({ ...fship });
      return fship;
    },

    async deleteOne(id: string): Promise<boolean> {
      const cols = await getRequiredCollections();
      const res = await cols.friendships.deleteOne({ id } as any);
      return (res.deletedCount || 0) > 0;
    },

    async deleteMany(filter: any): Promise<number> {
      const cols = await getRequiredCollections();
      const res = await cols.friendships.deleteMany(filter);
      return res.deletedCount || 0;
    },
  },

  callHistory: {
    async find(filter: any = {}): Promise<DbCallHistory[]> {
      const cols = await getRequiredCollections();
      return await cols.callHistory.find(filter).sort({ createdAt: -1 }).toArray();
    },

    async insertOne(call: DbCallHistory): Promise<DbCallHistory> {
      const cols = await getRequiredCollections();
      await cols.callHistory.insertOne({ ...call });
      return call;
    },

    async deleteMany(filter: any): Promise<number> {
      const cols = await getRequiredCollections();
      const res = await cols.callHistory.deleteMany(filter);
      return res.deletedCount || 0;
    },
  },

  statuses: {
    async find(filter: any = {}): Promise<DbStatus[]> {
      const cols = await getRequiredCollections();
      return await cols.statuses.find(filter).sort({ createdAt: 1 }).toArray();
    },

    async findById(id: string): Promise<DbStatus | null> {
      const cols = await getRequiredCollections();
      return await cols.statuses.findOne({ id } as any);
    },

    async insertOne(status: DbStatus): Promise<DbStatus> {
      const cols = await getRequiredCollections();
      await cols.statuses.insertOne({ ...status });
      return status;
    },

    async updateOne(id: string, updates: Partial<DbStatus>): Promise<DbStatus | null> {
      const cols = await getRequiredCollections();
      const result = await cols.statuses.findOneAndUpdate(
        { id } as any,
        { $set: updates },
        { returnDocument: 'after' }
      );
      return result;
    },

    async deleteOne(id: string): Promise<boolean> {
      const cols = await getRequiredCollections();
      const res = await cols.statuses.deleteOne({ id } as any);
      return (res.deletedCount || 0) > 0;
    },

    async deleteMany(filter: any): Promise<number> {
      const cols = await getRequiredCollections();
      const res = await cols.statuses.deleteMany(filter);
      return res.deletedCount || 0;
    },
  },

  stickers: {
    async find(filter: any = {}): Promise<DbSticker[]> {
      const cols = await getRequiredCollections();
      return await cols.stickers.find(filter).sort({ createdAt: -1 }).toArray();
    },

    async findById(id: string): Promise<DbSticker | null> {
      const cols = await getRequiredCollections();
      return await cols.stickers.findOne({ id } as any);
    },

    async insertOne(sticker: DbSticker): Promise<DbSticker> {
      const cols = await getRequiredCollections();
      await cols.stickers.updateOne(
        { id: sticker.id } as any,
        { $set: sticker },
        { upsert: true }
      );
      return sticker;
    },

    async deleteOne(id: string): Promise<boolean> {
      const cols = await getRequiredCollections();
      const res = await cols.stickers.deleteOne({ id } as any);
      return (res.deletedCount || 0) > 0;
    },
  },
};
