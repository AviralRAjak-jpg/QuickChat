import { Timestamp } from 'firebase/firestore';

export interface UserData {
  uid: string;
  username: string;
  username_lowercase?: string;
  email: string;
  photoURL: string | null;
  isOnline: boolean;
  lastSeen: number | null;
  bio?: string;
  status?: string;
  createdAt: Timestamp;
  isPremium?: boolean;
  aiUsageCount?: number;
  premiumTheme?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  status: 'sent' | 'delivered' | 'seen';
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions?: { [emoji: string]: string[] }; // emoji -> list of uids
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  participants: string[];
  participantData?: UserData[];
  name?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  lastMessageStatus?: 'sent' | 'delivered' | 'seen';
  unreadCount?: { [uid: string]: number };
  typing?: { [uid: string]: boolean };
  otherUser?: UserData; // For private chats
  isBlocked?: boolean;
  blockedAt?: Timestamp;
  blockedBy?: string;
  createdAt?: Timestamp;
  createdBy?: string;
}

export interface Call {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  status: 'ringing' | 'connected' | 'ended' | 'rejected';
  type: 'voice' | 'video';
  timestamp: Timestamp;
  conversationId: string;
  offer?: any;
  answer?: any;
}
