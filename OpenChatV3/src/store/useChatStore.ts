import { create } from 'zustand';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc,
  getDocs,
  limit,
  Timestamp,
  getDoc,
  increment,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Conversation, Message, UserData, Call } from '../types';
import { handleFirestoreError, OperationType, getUserFriendlyError } from '../lib/utils';
import { aiService } from '../services/aiService';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  conversationsLoading: boolean;
  typingUsers: { [convId: string]: string[] };
  
  // AI Assistant State
  suggestedReplies: string[];
  aiSummary: string | null;
  aiNotes: string | null;
  aiLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  handleError: (error: any, op: OperationType, path: string) => void;
  uploadProgress: number | null;
  
  setActiveConversation: (conv: Conversation | null) => void;
  subscribeToConversations: (uid: string) => () => void;
  subscribeToMessages: (convId: string) => () => void;
  sendMessage: (convId: string, text: string, senderName: string) => Promise<void>;
  setTyping: (convId: string, isTyping: boolean) => Promise<void>;
  markAsSeen: (convId: string) => Promise<void>;
  markAsDelivered: (convId: string) => Promise<void>;
  createPrivateChat: (otherUser: UserData) => Promise<Conversation>;
  searchUsers: (query: string) => Promise<UserData[]>;
  clearMessages: (convId: string) => Promise<void>;
  blockUser: (convId: string) => Promise<void>;
  reactToMessage: (convId: string, msgId: string, emoji: string) => Promise<void>;
  sendFile: (convId: string, file: File, senderName: string) => Promise<void>;
  createGroupChat: (name: string, participants: string[]) => Promise<Conversation>;
  
  // Call Actions
  currentCall: Call | null;
  incomingCall: Call | null;
  startCall: (receiver: UserData, convId: string, type: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  subscribeToCalls: (uid: string) => () => void;
  sendOffer: (callId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  sendAnswer: (callId: string, answer: RTCSessionDescriptionInit) => Promise<void>;
  addIceCandidate: (callId: string, candidate: RTCIceCandidate, type: 'caller' | 'receiver') => Promise<void>;
  
  // AI Assistant Actions
  getSuggestedReplies: () => Promise<void>;
  summarizeChat: () => Promise<void>;
  convertToNotes: () => Promise<void>;
  clearAIState: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  loading: false,
  conversationsLoading: false,
  typingUsers: {},
  currentCall: null,
  incomingCall: null,
  
  suggestedReplies: [],
  aiSummary: null,
  aiNotes: null,
  aiLoading: false,
  error: null,
  setError: (error) => set({ error }),
  uploadProgress: null,

  handleError: (error: any, op: OperationType, path: string) => {
    try {
      handleFirestoreError(error, op, path);
    } catch (e: any) {
      set({ error: getUserFriendlyError(e) });
      // Auto-clear error after 5 seconds
      setTimeout(() => set({ error: null }), 5000);
    }
  },

  setActiveConversation: (conv) => {
    set({ activeConversation: conv, suggestedReplies: [], aiSummary: null, aiNotes: null });
  },

  subscribeToConversations: (uid) => {
    set({ conversationsLoading: true });
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', uid),
      orderBy('lastMessageAt', 'desc')
    );

    const userCache = new Map<string, UserData>();

    return onSnapshot(q, async (snapshot) => {
      try {
        const convs = await Promise.all(snapshot.docs.map(async (d) => {
          const data = d.data() as Conversation;
          data.id = d.id;
          
          if (data.type === 'private') {
            const otherId = data.participants.find(p => p !== uid);
            if (otherId) {
              if (otherId === 'ai-assistant') {
                data.otherUser = {
                  uid: 'ai-assistant',
                  username: 'QuickChat AI',
                  email: 'ai@quickchat.com',
                  photoURL: 'https://ui-avatars.com/api/?name=AI&background=0D9488&color=fff',
                  isOnline: true,
                  lastSeen: Date.now()
                } as UserData;
              } else if (userCache.has(otherId)) {
                data.otherUser = userCache.get(otherId);
              } else {
                const userSnap = await getDoc(doc(db, 'users', otherId));
                if (userSnap.exists()) {
                  const userData = userSnap.data() as UserData;
                  userCache.set(otherId, userData);
                  data.otherUser = userData;
                }
              }
            }
          }
          return data;
        }));
        set({ conversations: convs, conversationsLoading: false });

        // Mark as delivered if last message is 'sent' and not from me
        convs.forEach(conv => {
          if (conv.lastMessageSenderId !== uid && conv.lastMessageStatus === 'sent') {
            get().markAsDelivered(conv.id);
          }
        });
      } catch (error) {
        set({ conversationsLoading: false });
        get().handleError(error, OperationType.GET, 'conversations');
      }
    }, (error) => {
      set({ conversationsLoading: false });
      get().handleError(error, OperationType.GET, 'conversations');
    });
  },

  subscribeToMessages: (convId) => {
    set({ loading: true });
    const q = query(
      collection(db, `conversations/${convId}/messages`),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Message));
      set({ messages: msgs, loading: false });
      
      // Mark as delivered if messages are 'sent' and not from me
      const uid = auth.currentUser?.uid;
      const sentMessages = msgs.filter(m => m.senderId !== uid && m.status === 'sent');
      if (sentMessages.length > 0) {
        get().markAsDelivered(convId);
      }

      // Auto-get suggestions if the last message is from the other user
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.senderId !== auth.currentUser?.uid) {
        get().getSuggestedReplies();
      } else {
        set({ suggestedReplies: [] });
      }
    }, (error) => {
      set({ loading: false });
      get().handleError(error, OperationType.GET, `conversations/${convId}/messages`);
    });
  },

  sendMessage: async (convId, text, senderName) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Clear typing status
    get().setTyping(convId, false);

    const { activeConversation } = get();
    if (!activeConversation) return;
    if (activeConversation.isBlocked) return;

    const messageData = {
      conversationId: convId,
      senderId: uid,
      senderName,
      text,
      timestamp: serverTimestamp(),
      type: 'text',
      status: 'sent'
    };

    try {
      await addDoc(collection(db, `conversations/${convId}/messages`), messageData);
      
      // Update conversation with last message info and increment unread count for other participants
      const updates: any = {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: uid,
        lastMessageStatus: 'sent'
      };

      // Increment unread count for all participants except the sender
      activeConversation.participants.forEach(pId => {
        if (pId !== uid) {
          updates[`unreadCount.${pId}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'conversations', convId), updates);

      if (activeConversation?.otherUser?.uid === 'ai-assistant') {
        try {
          const aiText = await aiService.generateAIResponse(text);
          
          await addDoc(collection(db, `conversations/${convId}/messages`), {
            conversationId: convId,
            senderId: 'ai-assistant',
            senderName: 'QuickChat AI',
            text: aiText,
            timestamp: serverTimestamp(),
            type: 'text',
            status: 'sent'
          });

          await updateDoc(doc(db, 'conversations', convId), {
            lastMessage: aiText,
            lastMessageAt: serverTimestamp(),
            lastMessageSenderId: 'ai-assistant'
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('permission')) {
            get().handleError(error, OperationType.WRITE, `conversations/${convId}/messages`);
          }
          console.error('AI Error:', error);
        }
      }
    } catch (error) {
      get().handleError(error, OperationType.WRITE, `conversations/${convId}/messages`);
    }
  },

  setTyping: async (convId, isTyping) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const { activeConversation } = get();
    if (!activeConversation || activeConversation.isBlocked) return;

    // Only update if the status actually changes to minimize writes
    const currentStatus = activeConversation.typing?.[uid] || false;
    if (currentStatus === isTyping) return;

    try {
      await updateDoc(doc(db, 'conversations', convId), {
        [`typing.${uid}`]: isTyping
      });
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `conversations/${convId}`);
    }
  },

  markAsSeen: async (convId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const { messages, activeConversation } = get();
    if (activeConversation?.isBlocked) return;
    
    try {
      // 1. Reset unread count for the current user and update last message status if needed
      const updates: any = {};
      const currentUnread = activeConversation?.unreadCount?.[uid] || 0;
      if (currentUnread > 0) updates[`unreadCount.${uid}`] = 0;

      // If the last message was sent by someone else and isn't 'seen', mark it as seen in the conversation doc too
      if (activeConversation && activeConversation.lastMessageSenderId !== uid && activeConversation.lastMessageStatus !== 'seen') {
        updates.lastMessageStatus = 'seen';
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'conversations', convId), updates);
      }

      // 2. Mark all messages from the other user as 'seen' using a batch for efficiency
      const q = query(
        collection(db, `conversations/${convId}/messages`),
        where('status', 'in', ['sent', 'delivered'])
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          if (d.data().senderId !== uid) {
            batch.update(d.ref, { status: 'seen' });
          }
        });
        await batch.commit();
      }
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `conversations/${convId}`);
    }
  },

  markAsDelivered: async (convId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    try {
      // 1. Update messages status to 'delivered' in the subcollection
      const q = query(
        collection(db, `conversations/${convId}/messages`),
        where('senderId', '!=', uid),
        where('status', '==', 'sent')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          batch.update(d.ref, { status: 'delivered' });
        });
        await batch.commit();
      }

      // 2. Update conversation lastMessageStatus if it was 'sent'
      const convRef = doc(db, 'conversations', convId);
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        const data = convSnap.data() as Conversation;
        if (data.lastMessageSenderId !== uid && data.lastMessageStatus === 'sent') {
          await updateDoc(convRef, { lastMessageStatus: 'delivered' });
        }
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
    }
  },

  createPrivateChat: async (otherUser) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    try {
      const q = query(
        collection(db, 'conversations'),
        where('type', '==', 'private'),
        where('participants', 'array-contains', uid)
      );
      
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find(d => d.data().participants.includes(otherUser.uid));
      
      if (existing) {
        const data = existing.data() as Conversation;
        data.id = existing.id;
        data.otherUser = otherUser;
        return data;
      }

      const newConv = {
        type: 'private',
        participants: [uid, otherUser.uid],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: { [uid]: 0, [otherUser.uid]: 0 },
        typing: { [uid]: false, [otherUser.uid]: false }
      };

      const docRef = await addDoc(collection(db, 'conversations'), newConv);
      return { ...newConv, id: docRef.id, otherUser } as Conversation;
    } catch (error) {
      get().handleError(error, OperationType.WRITE, 'conversations');
      throw error;
    }
  },

  createGroupChat: async (name, participants) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    try {
      const allParticipants = [...new Set([uid, ...participants])];
      const unreadCount: { [key: string]: number } = {};
      const typing: { [key: string]: boolean } = {};
      
      allParticipants.forEach(pId => {
        unreadCount[pId] = 0;
        typing[pId] = false;
      });

      const newConv = {
        type: 'group',
        name,
        participants: allParticipants,
        lastMessage: 'Group created',
        lastMessageAt: serverTimestamp(),
        unreadCount,
        typing,
        createdAt: serverTimestamp(),
        createdBy: uid
      };

      const docRef = await addDoc(collection(db, 'conversations'), newConv);
      return { ...newConv, id: docRef.id } as Conversation;
    } catch (error) {
      get().handleError(error, OperationType.WRITE, 'conversations');
      throw error;
    }
  },

  searchUsers: async (searchTerm) => {
    try {
      const term = searchTerm.toLowerCase();
      const q = query(
        collection(db, 'users'),
        where('username_lowercase', '>=', term),
        where('username_lowercase', '<=', term + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as UserData);
    } catch (error) {
      get().handleError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  clearMessages: async (convId) => {
    try {
      const q = query(collection(db, `conversations/${convId}/messages`));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      
      // Update last message in conversation
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: 'Messages cleared',
        lastMessageAt: serverTimestamp(),
        lastMessageStatus: 'sent'
      });
    } catch (error) {
      get().handleError(error, OperationType.DELETE, `conversations/${convId}/messages`);
    }
  },

  blockUser: async (convId) => {
    try {
      const { conversations } = get();
      const conv = conversations.find(c => c.id === convId);
      const isCurrentlyBlocked = conv?.isBlocked || false;

      await updateDoc(doc(db, 'conversations', convId), {
        isBlocked: !isCurrentlyBlocked,
        blockedAt: !isCurrentlyBlocked ? serverTimestamp() : null,
        blockedBy: !isCurrentlyBlocked ? auth.currentUser?.uid : null
      });
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `conversations/${convId}`);
    }
  },

  reactToMessage: async (convId, msgId, emoji) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const msgRef = doc(db, `conversations/${convId}/messages`, msgId);
      const msgSnap = await getDoc(msgRef);
      if (!msgSnap.exists()) return;

      const data = msgSnap.data() as Message;
      const reactions = data.reactions || {};
      const uids = reactions[emoji] || [];

      if (uids.includes(uid)) {
        // Remove reaction
        reactions[emoji] = uids.filter(id => id !== uid);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        // Add reaction
        reactions[emoji] = [...uids, uid];
      }

      await updateDoc(msgRef, { reactions });
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `conversations/${convId}/messages/${msgId}`);
    }
  },

  sendFile: async (convId, file, senderName) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const { activeConversation } = get();
    if (!activeConversation || activeConversation.isBlocked) return;

    console.log(`Starting upload for file: ${file.name} (${file.size} bytes)`);
    
    try {
      set({ uploadProgress: 0 });
      
      // 1. Upload file to Firebase Storage with progress tracking
      const fileId = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `conversations/${convId}/${fileId}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Track progress
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
          set({ uploadProgress: progress });
        },
        (error) => {
          console.error('Upload task error:', error);
          set({ uploadProgress: null });
          get().handleError(error, OperationType.WRITE, `conversations/${convId}/messages`);
        }
      );

      // Wait for upload to complete
      await uploadTask;
      
      const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
      console.log('File uploaded successfully, URL:', fileUrl);
      set({ uploadProgress: null });

      // 2. Determine message type
      const isImage = file.type.startsWith('image/');
      const type = isImage ? 'image' : 'file';

      // 3. Create message in Firestore
      const messageData = {
        conversationId: convId,
        senderId: uid,
        senderName,
        text: isImage ? 'Sent an image' : `Sent a file: ${file.name}`,
        timestamp: serverTimestamp(),
        type,
        fileUrl,
        fileName: file.name,
        status: 'sent'
      };

      const docRef = await addDoc(collection(db, `conversations/${convId}/messages`), messageData);
      
      // 4. Update conversation
      await updateDoc(doc(db, 'conversations', convId), {
        lastMessage: isImage ? '📷 Image' : `📁 ${file.name}`,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: uid,
        lastMessageStatus: 'sent'
      });

    } catch (error) {
      set({ uploadProgress: null });
      console.error('Error in sendFile:', error);
      get().handleError(error, OperationType.WRITE, `conversations/${convId}/messages`);
      throw error;
    }
  },

  startCall: async (receiver, convId, type) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const callData = {
        callerId: user.uid,
        callerName: user.displayName || 'User',
        callerPhoto: user.photoURL || '',
        receiverId: receiver.uid,
        receiverName: receiver.username,
        receiverPhoto: receiver.photoURL || '',
        status: 'ringing',
        type,
        timestamp: serverTimestamp(),
        conversationId: convId
      };

      const docRef = await addDoc(collection(db, 'calls'), callData);
      set({ currentCall: { ...callData, id: docRef.id, timestamp: Timestamp.now() } as Call });
      
      // Listen for call status changes
      const unsub = onSnapshot(doc(db, 'calls', docRef.id), (doc) => {
        if (doc.exists()) {
          const data = doc.data() as Call;
          if (data.status === 'rejected' || data.status === 'ended') {
            set({ currentCall: null });
            unsub();
          } else if (data.status === 'connected') {
            set({ currentCall: { ...data, id: doc.id } });
          }
        } else {
          set({ currentCall: null });
          unsub();
        }
      });
    } catch (error) {
      get().handleError(error, OperationType.WRITE, 'calls');
    }
  },

  acceptCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'connected'
      });
      set({ currentCall: { ...incomingCall, status: 'connected' }, incomingCall: null });
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `calls/${incomingCall.id}`);
    }
  },

  rejectCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'rejected'
      });
      set({ incomingCall: null });
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `calls/${incomingCall.id}`);
    }
  },

  endCall: async () => {
    const { currentCall, incomingCall } = get();
    const call = currentCall || incomingCall;
    if (!call) return;

    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'ended'
      });
      set({ currentCall: null, incomingCall: null });
    } catch (error) {
      get().handleError(error, OperationType.UPDATE, `calls/${call.id}`);
    }
  },

  subscribeToCalls: (uid) => {
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', uid),
      where('status', '==', 'ringing'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const call = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as Call;
        // Only set if not already in a call
        if (!get().currentCall && !get().incomingCall) {
          set({ incomingCall: call });
          
          // Listen for this specific call's status
          const unsub = onSnapshot(doc(db, 'calls', call.id), (doc) => {
            if (doc.exists()) {
              const data = doc.data() as Call;
              if (data.status === 'ended' || data.status === 'rejected') {
                set({ incomingCall: null });
                unsub();
              }
            } else {
              set({ incomingCall: null });
              unsub();
            }
          });
        }
      }
    });
  },

  sendOffer: async (callId, offer) => {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      });
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  },

  sendAnswer: async (callId, answer) => {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      });
    } catch (error) {
      console.error('Error sending answer:', error);
    }
  },

  addIceCandidate: async (callId, candidate, type) => {
    try {
      const collectionName = type === 'caller' ? 'callerCandidates' : 'receiverCandidates';
      await addDoc(collection(db, `calls/${callId}/${collectionName}`), candidate.toJSON());
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  },

  // AI Assistant Actions
  getSuggestedReplies: async () => {
    const { messages } = get();
    if (messages.length === 0) return;
    
    // Only get suggestions if the last message is from someone else
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.senderId === auth.currentUser?.uid) return;

    const history = messages.slice(-10).map(m => `${m.senderName}: ${m.text}`);
    const suggestions = await aiService.getSuggestedReplies(history);
    set({ suggestedReplies: suggestions });
  },

  summarizeChat: async () => {
    const { messages } = get();
    if (messages.length === 0) return;
    
    set({ aiLoading: true, aiSummary: null, aiNotes: null });
    const history = messages.map(m => `${m.senderName}: ${m.text}`);
    const summary = await aiService.summarizeChat(history);
    set({ aiSummary: summary, aiLoading: false });
  },

  convertToNotes: async () => {
    const { messages } = get();
    if (messages.length === 0) return;
    
    set({ aiLoading: true, aiSummary: null, aiNotes: null });
    const history = messages.map(m => `${m.senderName}: ${m.text}`);
    const notes = await aiService.convertToNotes(history);
    set({ aiNotes: notes, aiLoading: false });
  },

  clearAIState: () => set({ aiSummary: null, aiNotes: null, suggestedReplies: [] })
}));
