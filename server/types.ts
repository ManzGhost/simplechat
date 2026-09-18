export interface DbUser {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string; // BCrypt hash
  profileImage?: string;
  about?: string; // Bio or custom status message (e.g. "Available", "Hey there! I am using SimpleChat")
  online: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface DbConversation {
  id: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type DbMessageType = 'TEXT' | 'STICKER' | 'CALL_RECORD' | 'VOICE';

export interface DbMessageReplyMetadata {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType?: DbMessageType;
  isStatusReply?: boolean;
  statusType?: 'TEXT' | 'IMAGE';
  statusThumbnail?: string;
  statusCaption?: string;
  statusBackgroundColor?: string;
}

export interface DbMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: DbMessageType;
  timestamp: string;
  delivered: boolean;
  seen: boolean;
  replyTo?: DbMessageReplyMetadata;
}

export interface DbFriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface DbFriendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
}

export interface DbCallHistory {
  id: string;
  callerId: string;
  receiverId: string;
  conversationId: string;
  callType: 'VOICE' | 'VIDEO';
  status: 'COMPLETED' | 'MISSED' | 'REJECTED' | 'CANCELLED';
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface DbStatusViewer {
  userId: string;
  viewedAt: string;
}

export interface DbStatus {
  id: string;
  userId: string;
  type: 'TEXT' | 'IMAGE';
  content: string;
  caption?: string;
  backgroundColor?: string;
  fontStyle?: string;
  createdAt: string;
  expiresAt: string;
  viewers: DbStatusViewer[];
}

export interface DbSticker {
  id: string;
  packId: string;
  title: string;
  badgeText?: string;
  color?: string;
  accentColor?: string;
  emoji?: string;
  imageUrl?: string;
  subtext?: string;
  userId?: string;
  createdAt: string;
}
