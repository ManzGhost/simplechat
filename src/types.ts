export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  profileImage?: string;
  about?: string; // Custom status / bio message (e.g. "Available", "Hey there! I am using SimpleChat")
  online: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: User[];
  otherUser?: User;
  lastMessage?: Message;
  lastMessageTimestamp?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = 'TEXT' | 'STICKER' | 'CALL_RECORD' | 'VOICE';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
export type CallSignalType = 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE' | 'HANGUP' | 'REJECT' | 'BUSY' | 'MEDIA_TOGGLE';

export interface ActiveCallSession {
  callId: string;
  conversationId: string;
  peerUser: User;
  callType: CallType;
  isOutgoing: boolean;
  status: CallStatus;
  startTime?: number;
  duration: number;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isPeerVideoEnabled: boolean;
  isPeerMuted: boolean;
  isPeerScreenSharing?: boolean;
  cameraFacing?: 'user' | 'environment';
  cameraRotation?: number;
  peerCameraRotation?: number;
  peerCameraFacing?: 'user' | 'environment';
  isDualCamera?: boolean;
  dualLayout?: 'pip' | 'split';
  dualMainFacing?: 'user' | 'environment';
  peerIsDualCamera?: boolean;
  peerDualLayout?: 'pip' | 'split';
}

export interface CallSignalPayload {
  type: 'CALL_SIGNAL';
  signalType: CallSignalType;
  senderId: string;
  targetUserId: string;
  callId: string;
  conversationId?: string;
  callType?: CallType;
  payload?: any;
}

export interface MessageReplyMetadata {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType?: MessageType;
  isStatusReply?: boolean;
  statusType?: 'TEXT' | 'IMAGE';
  statusThumbnail?: string;
  statusCaption?: string;
  statusBackgroundColor?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: MessageType;
  timestamp: string;
  delivered: boolean;
  seen: boolean;
  replyTo?: MessageReplyMetadata;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginPayload {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  profileImage?: string;
}

export interface UpdateProfilePayload {
  name: string;
  profileImage?: string;
  about?: string;
}

export interface StatusViewer {
  userId: string;
  viewedAt: string;
  user?: User;
}

export interface UserStatus {
  id: string;
  userId: string;
  user?: User;
  type: 'TEXT' | 'IMAGE';
  content: string;
  caption?: string;
  backgroundColor?: string;
  fontStyle?: string;
  createdAt: string;
  expiresAt: string;
  viewers: StatusViewer[];
  hasViewed?: boolean;
}

export interface UserStatusGroup {
  user: User;
  statuses: UserStatus[];
  allViewed: boolean;
  latestStatus: UserStatus;
  updatedAt: string;
}

export interface StatusFeedResponse {
  myStatuses: UserStatus[];
  recentUpdates: UserStatusGroup[];
  viewedUpdates: UserStatusGroup[];
}

export interface CreateStatusPayload {
  type: 'TEXT' | 'IMAGE';
  content: string;
  caption?: string;
  backgroundColor?: string;
  fontStyle?: string;
}

export interface WsMessagePayload {
  type?: 'CHAT_MESSAGE' | 'MESSAGES_SEEN' | 'USER_PRESENCE' | 'CONVERSATION_DELETED' | 'TYPING' | 'CALL_SIGNAL' | 'STATUS_CREATED' | 'STATUS_VIEWED' | 'STATUS_DELETED';
  conversationId?: string;
  receiverId?: string;
  senderId?: string;
  content?: string;
  messageType?: MessageType;
  message?: Message;
  userId?: string;
  online?: boolean;
  lastSeen?: string;
  // Status fields
  statusId?: string;
  status?: UserStatus;
  viewer?: User;
  viewedAt?: string;
  // Call signaling fields
  signalType?: CallSignalType;
  callId?: string;
  targetUserId?: string;
  callType?: CallType;
  payload?: any;
}

export type ThemeMode = 'light' | 'dark' | 'night';
