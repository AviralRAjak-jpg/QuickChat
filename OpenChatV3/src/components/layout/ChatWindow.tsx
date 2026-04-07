import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { auth } from '../../firebase';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  Phone, 
  Video, 
  ChevronLeft,
  Sparkles,
  Check,
  CheckCheck,
  MessageSquare as MessageSquareIcon,
  Wand2,
  FileText,
  ListTodo,
  X,
  Loader2,
  Crown,
  Download,
  Image as ImageIcon,
  File as FileIcon,
  Users,
  Plus,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { cn } from '../../lib/utils';
import { ChatSkeleton } from '../ui/Skeleton';
import { Message } from '../../types';
import Markdown from 'react-markdown';
import PricingModal from '../ui/PricingModal';

const MessageItem = memo(({ 
  msg, 
  isMe, 
  showAvatar, 
  isAI, 
  otherUser, 
  isGrouped,
  onReact,
  convId,
  isGroup
}: { 
  msg: Message; 
  isMe: boolean; 
  showAvatar: boolean; 
  isAI: boolean; 
  otherUser: any;
  isGrouped: boolean;
  onReact: (emoji: string) => void;
  convId: string;
  isGroup?: boolean;
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const reactions = msg.reactions || {};
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={cn(
        "flex items-end gap-3",
        isMe ? "flex-row-reverse" : "flex-row",
        isGrouped ? "mt-1" : "mt-4"
      )}
    >
      {!isMe && (
        <div className="w-10 flex-shrink-0">
          {showAvatar && (
            <img
              src={isAI ? 'https://api.dicebear.com/7.x/bottts/svg?seed=QuickChat' : otherUser?.photoURL || 'https://ui-avatars.com/api/?name=User'}
              className="w-10 h-10 rounded-xl mb-1 shadow-lg border border-white/5 object-cover"
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      )}
      
      <div className={cn(
        "max-w-[85%] sm:max-w-[70%] group relative flex flex-col",
        isMe ? "items-end" : "items-start"
      )}>
        {/* Reaction Picker Button */}
        <div className={cn(
          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10",
          isMe ? "-left-10" : "-right-10"
        )}>
          <button 
            onClick={() => setShowReactions(!showReactions)}
            className="p-2 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 text-zinc-400 hover:text-neon-cyan transition-colors"
          >
            <Smile className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 10 }}
                className={cn(
                  "absolute bottom-full mb-2 bg-zinc-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-1.5 flex gap-1.5",
                  isMe ? "left-0" : "right-0"
                )}
              >
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowReactions(false);
                    }}
                    className="hover:scale-125 transition-transform p-1.5 text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={cn(
          "px-4 py-2.5 rounded-2xl text-[15px] relative shadow-xl transition-all duration-300 overflow-hidden",
          isMe 
            ? "bg-neon-cyan/10 border border-neon-cyan/20 text-white rounded-tr-none" 
            : "bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-tl-none"
        )}>
          {isGroup && !isMe && !isAI && (
            <p className="text-[11px] font-bold text-neon-cyan mb-1">{msg.senderName}</p>
          )}
          
          {msg.type === 'image' ? (
            <div className="flex flex-col gap-2">
              <div className="relative group/img overflow-hidden rounded-xl">
                <img 
                  src={msg.fileUrl} 
                  alt={msg.fileName} 
                  className="max-w-full rounded-xl cursor-pointer transition-transform duration-500 group-hover/img:scale-105"
                  onClick={() => window.open(msg.fileUrl, '_blank')}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
              </div>
              {msg.text && msg.text !== 'Sent an image' && (
                <p className="leading-relaxed break-words pr-14">{msg.text}</p>
              )}
            </div>
          ) : msg.type === 'file' ? (
            <div className="flex flex-col gap-2 min-w-[240px]">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 group/file hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 flex items-center justify-center text-neon-cyan shadow-lg shadow-neon-cyan/10">
                  <FileIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white">{msg.fileName}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Document</p>
                </div>
                <a 
                  href={msg.fileUrl} 
                  download={msg.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 hover:bg-neon-cyan/20 rounded-xl transition-all text-neon-cyan"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
              {msg.text && !msg.text.startsWith('Sent a file:') && (
                <p className="leading-relaxed break-words pr-14">{msg.text}</p>
              )}
            </div>
          ) : (
            <p className="leading-relaxed break-words pr-14">{msg.text}</p>
          )}
          
          <div className={cn(
            "absolute bottom-1.5 right-3 flex items-center gap-1.5 text-[10px] font-medium",
            isMe ? "text-neon-cyan/60" : "text-zinc-500"
          )}>
            {msg.timestamp && format(msg.timestamp.toDate(), 'HH:mm')}
            {isMe && (
              msg.status === 'seen' 
                ? <CheckCheck className="w-3.5 h-3.5 text-neon-cyan" /> 
                : msg.status === 'delivered'
                  ? <CheckCheck className="w-3.5 h-3.5" />
                  : <Check className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        {/* Reactions Display */}
        {Object.keys(reactions).length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-1.5 mt-2",
            isMe ? "justify-end" : "justify-start"
          )}>
            {Object.entries(reactions).map(([emoji, uids]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-xl text-[12px] border transition-all backdrop-blur-md",
                  uids.includes(auth.currentUser?.uid || '')
                    ? "bg-neon-cyan/20 border-neon-cyan/30 text-neon-cyan shadow-lg shadow-neon-cyan/10"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                )}
              >
                <span>{emoji}</span>
                {uids.length > 1 && <span className="font-bold">{uids.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

MessageItem.displayName = 'MessageItem';

const ChatWindow: React.FC = () => {
  const { user, userData, theme, incrementAIUsage } = useAuthStore();
  const { 
    activeConversation, 
    messages, 
    loading,
    subscribeToMessages, 
    sendMessage, 
    setTyping, 
    markAsSeen,
    setActiveConversation,
    suggestedReplies,
    aiSummary,
    aiNotes,
    aiLoading,
    summarizeChat,
    convertToNotes,
    clearAIState,
    clearMessages,
    blockUser,
    startCall,
    reactToMessage,
    sendFile,
    uploadProgress,
    setError
  } = useChatStore();
  
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeConversation?.id) {
      const unsubscribe = subscribeToMessages(activeConversation.id);
      markAsSeen(activeConversation.id);
      return () => {
        unsubscribe();
        setTyping(activeConversation.id, false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [activeConversation?.id, subscribeToMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (activeConversation?.id && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== user?.uid && lastMsg.status !== 'seen') {
        markAsSeen(activeConversation.id);
      }
    }
  }, [messages, loading, activeConversation?.id, user?.uid]);

  const handleAIAction = async (action: 'summary' | 'notes') => {
    if (!userData?.isPremium && (userData?.aiUsageCount || 0) >= 5) {
      setIsPricingOpen(true);
      return;
    }
    setShowAIMenu(false);
    if (action === 'summary') await summarizeChat();
    else await convertToNotes();
    await incrementAIUsage();
  };

  const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
    e?.preventDefault();
    const text = textOverride || inputText;
    if (!text.trim() || !activeConversation?.id) return;
    setInputText('');
    await sendMessage(activeConversation.id, text, userData?.username || 'User');
    setTyping(activeConversation.id, false);
    inputRef.current?.focus();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation?.id) return;
    
    if (file.size === 0) {
      setError('Cannot upload empty files');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large (max 10MB)');
      return;
    }
    
    setIsUploading(true);
    try {
      await sendFile(activeConversation.id, file, userData?.username || 'User');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeConversation?.id) return;
    setTyping(activeConversation.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (activeConversation?.id) setTyping(activeConversation.id, false);
    }, 3000);
  };

  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const isMe = msg.senderId === user?.uid;
      const isSameSender = prevMsg?.senderId === msg.senderId;
      const isRecent = prevMsg && msg.timestamp && prevMsg.timestamp && 
        (msg.timestamp.toDate().getTime() - prevMsg.timestamp.toDate().getTime() < 600000);
      const isGrouped = isSameSender && isRecent;
      const showAvatar = !isMe && !isGrouped;
      return { msg, isMe, showAvatar, isGrouped };
    });
  }, [messages, user?.uid]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-chat-bg text-zinc-500 p-8 text-center overflow-hidden">
        <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center max-w-md"
        >
          <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl relative group">
            <div className="absolute inset-0 bg-neon-cyan/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <MessageSquareIcon className="w-12 h-12 text-neon-cyan relative z-10" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight text-glow-cyan">Welcome to QuickChat</h2>
          <p className="text-zinc-500 leading-relaxed text-[15px]">
            Select a conversation to start messaging. Experience the future of communication with AI-powered insights and neon aesthetics.
          </p>
          <div className="mt-12 flex items-center gap-3 text-zinc-600 text-[13px] font-medium">
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            <span>Powered by Gemini AI</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const otherUser = activeConversation.otherUser;
  const isAI = otherUser?.uid === 'ai-assistant';
  const isGroup = activeConversation.type === 'group';
  const isTyping = activeConversation.typing && Object.entries(activeConversation.typing).some(([uid, typing]) => uid !== user?.uid && typing);

  return (
    <div className="flex-1 flex flex-col h-full bg-chat-bg overflow-hidden relative">
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
      
      {/* Contact Info Modal */}
      <AnimatePresence>
        {showContactInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowContactInfo(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-sidebar-bg rounded-3xl shadow-2xl overflow-hidden z-10 border border-white/10"
            >
              <div className="h-40 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 relative">
                <button 
                  onClick={() => setShowContactInfo(false)}
                  className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-8 pb-10 -mt-20 flex flex-col items-center">
                <div className="w-36 h-36 rounded-3xl border-4 border-sidebar-bg overflow-hidden bg-zinc-800 shadow-2xl">
                  <img 
                    src={otherUser?.photoURL || 'https://ui-avatars.com/api/?name=User'} 
                    className="w-full h-full object-cover"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">
                  {otherUser?.username || 'User'}
                </h3>
                <p className="text-zinc-500 text-sm font-medium">
                  {otherUser?.email || 'No email provided'}
                </p>
                
                {otherUser?.bio && (
                  <p className="mt-6 text-center text-zinc-400 text-[15px] leading-relaxed italic">
                    "{otherUser.bio}"
                  </p>
                )}
                
                <div className="mt-8 w-full grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Status</div>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", otherUser?.isOnline ? "bg-neon-cyan shadow-[0_0_8px_rgba(0,242,255,0.5)]" : "bg-zinc-700")} />
                      <span className="text-sm font-bold text-zinc-200">
                        {otherUser?.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Member Since</div>
                    <div className="text-sm font-bold text-zinc-200">
                      {otherUser?.createdAt ? format(otherUser.createdAt.toDate(), 'MMM yyyy') : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <div className="h-20 px-6 border-b border-white/5 flex items-center justify-between bg-sidebar-bg/80 backdrop-blur-xl z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveConversation(null)}
            className="md:hidden p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative cursor-pointer group" onClick={() => setShowContactInfo(true)}>
            {isGroup ? (
              <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 flex items-center justify-center text-neon-cyan border border-neon-cyan/20">
                <Users className="w-6 h-6" />
              </div>
            ) : isAI ? (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center shadow-lg shadow-neon-cyan/20">
                <Sparkles className="text-white w-6 h-6" />
              </div>
            ) : (
              <img
                src={otherUser?.photoURL || 'https://ui-avatars.com/api/?name=Chat'}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:border-neon-cyan/50 transition-colors"
                referrerPolicy="no-referrer"
              />
            )}
            {!isAI && !isGroup && otherUser?.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-cyan border-2 border-sidebar-bg rounded-full shadow-lg shadow-neon-cyan/30"></div>
            )}
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-white truncate text-[17px] tracking-tight">
              {isGroup ? activeConversation.name : (otherUser?.username || 'Chat')}
            </h3>
            <div className="flex items-center gap-2 h-5">
              {isAI ? (
                <span className="text-neon-cyan text-[11px] font-bold uppercase tracking-wider">Always online</span>
              ) : isTyping ? (
                <span className="text-neon-cyan animate-pulse text-[11px] font-bold uppercase tracking-wider">
                  Typing...
                </span>
              ) : isGroup ? (
                <span className="text-zinc-500 text-[11px] font-medium">{activeConversation.participants?.length || 0} members</span>
              ) : otherUser?.isOnline ? (
                <span className="text-neon-cyan/70 text-[11px] font-bold uppercase tracking-wider">Online</span>
              ) : (
                <span className="text-zinc-600 text-[11px] font-medium uppercase tracking-wider">Offline</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAI && (
            <div className="relative">
              <button 
                onClick={() => setShowAIMenu(!showAIMenu)}
                className={cn(
                  "p-2.5 rounded-xl transition-all flex items-center gap-2 px-4 shadow-lg",
                  showAIMenu ? "bg-neon-cyan text-nav-bg" : "bg-white/5 text-neon-cyan hover:bg-white/10 border border-white/5"
                )}
              >
                <Wand2 className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">AI Power</span>
              </button>
              
              <AnimatePresence>
                {showAIMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-64 bg-sidebar-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <button 
                      onClick={() => handleAIAction('summary')}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-neon-cyan" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">Summarize</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Quick Overview</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => handleAIAction('notes')}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                        <ListTodo className="w-5 h-5 text-neon-purple" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">Action Items</div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Extract Tasks</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {!isAI && !isGroup && (
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => activeConversation?.otherUser && startCall(activeConversation.otherUser, activeConversation.id, 'voice')}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all text-zinc-400 hover:text-white"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button 
                onClick={() => activeConversation?.otherUser && startCall(activeConversation.otherUser, activeConversation.id, 'video')}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all text-zinc-400 hover:text-white"
              >
                <Video className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                showMoreMenu ? "bg-white/10 text-white" : "hover:bg-white/5 text-zinc-400"
              )}
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            
            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-56 bg-sidebar-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <button 
                      onClick={() => { setShowContactInfo(true); setShowMoreMenu(false); }}
                      className="w-full px-5 py-4 flex items-center gap-3 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      View Profile
                    </button>
                    <button 
                      onClick={() => { clearMessages(activeConversation.id); setShowMoreMenu(false); }}
                      className="w-full px-5 py-4 flex items-center gap-3 text-sm font-bold text-zinc-300 hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                      <X className="w-4 h-4" />
                      Clear Chat
                    </button>
                    <button 
                      onClick={() => { blockUser(activeConversation.id); setShowMoreMenu(false); }}
                      className="w-full px-5 py-4 flex items-center gap-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors border-t border-white/5"
                    >
                      <X className="w-4 h-4" />
                      {activeConversation?.isBlocked ? 'Unblock' : 'Block'} User
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar relative"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      >
        {loading ? (
          <ChatSkeleton />
        ) : (
          <div className="flex flex-col min-h-full">
            <AnimatePresence initial={false}>
              {groupedMessages.map(({ msg, isMe, showAvatar, isGrouped }, idx) => {
                const showDate = idx === 0 || !isSameDay(msg.timestamp?.toDate() || new Date(), messages[idx - 1].timestamp?.toDate() || new Date());
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && msg.timestamp && (
                      <div className="flex justify-center my-8">
                        <span className="px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-[11px] font-bold text-zinc-500 uppercase tracking-widest shadow-lg">
                          {format(msg.timestamp.toDate(), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <MessageItem 
                      msg={msg}
                      isMe={isMe}
                      showAvatar={showAvatar}
                      isAI={isAI}
                      otherUser={otherUser}
                      isGrouped={isGrouped}
                      onReact={(emoji) => activeConversation && reactToMessage(activeConversation.id, msg.id, emoji)}
                      convId={activeConversation?.id || ''}
                      isGroup={isGroup}
                    />
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
            
            {/* AI Assistant Modals */}
            <AnimatePresence>
              {(aiSummary || aiNotes || aiLoading) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-2xl bg-sidebar-bg rounded-3xl shadow-2xl overflow-hidden border border-white/10"
                  >
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neon-cyan/10 rounded-xl flex items-center justify-center">
                          {aiSummary ? <FileText className="text-neon-cyan w-5 h-5" /> : <ListTodo className="text-neon-cyan w-5 h-5" />}
                        </div>
                        <h3 className="font-bold text-white text-lg">
                          {aiSummary ? 'AI Summary' : 'AI Action Items'}
                        </h3>
                      </div>
                      <button onClick={clearAIState} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-zinc-500" />
                      </button>
                    </div>
                    
                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-neon-cyan/20 blur-xl animate-pulse" />
                            <Loader2 className="w-10 h-10 text-neon-cyan animate-spin relative z-10" />
                          </div>
                          <p className="text-sm text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Processing with Gemini...</p>
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-neon max-w-none">
                          <Markdown>{aiSummary || aiNotes || ''}</Markdown>
                        </div>
                      )}
                    </div>
                    
                    {!aiLoading && (
                      <div className="px-8 py-5 bg-white/5 border-t border-white/5 flex justify-end">
                        <button 
                          onClick={clearAIState}
                          className="px-6 py-2.5 bg-neon-cyan text-nav-bg rounded-xl font-bold text-sm hover:bg-neon-cyan/90 transition-all shadow-lg shadow-neon-cyan/20"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 bg-sidebar-bg/90 backdrop-blur-xl border-t border-white/5">
        {/* Suggested Replies */}
        <AnimatePresence>
          {suggestedReplies.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 mb-4"
            >
              {suggestedReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, reply)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[13px] text-neon-cyan font-bold hover:bg-neon-cyan hover:text-nav-bg transition-all shadow-lg shadow-black/20"
                >
                  {reply}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-6xl mx-auto mb-4 px-2"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Uploading File...</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Please wait</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-neon-cyan font-bold">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-blue shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="max-w-6xl mx-auto flex items-center gap-3">
          {activeConversation?.isBlocked ? (
            <div className="flex-1 bg-red-500/5 py-4 px-6 rounded-2xl text-center text-red-500 text-sm font-bold border border-red-500/10">
              {activeConversation.blockedBy === user?.uid 
                ? "You blocked this contact. Unblock to send messages." 
                : "You have been blocked by this contact."}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white"
                >
                  <Smile className="w-6 h-6" />
                </button>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              </div>
              
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={inputText}
                  onChange={handleInputChange}
                  onFocus={() => setShowEmojiPicker(false)}
                  className="w-full bg-white/5 border border-white/5 focus:border-neon-cyan/50 focus:bg-white/10 focus:ring-0 text-white placeholder:text-zinc-600 py-3.5 px-5 rounded-2xl text-[15px] transition-all shadow-inner"
                />
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      className="absolute bottom-16 left-0 z-50 shadow-2xl"
                    >
                      <EmojiPicker 
                        onEmojiClick={(emoji) => setInputText(prev => prev + emoji.emoji)}
                        theme={theme as any}
                        lazyLoadEmojis
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className={cn(
                  "w-14 h-14 rounded-2xl transition-all shadow-xl flex items-center justify-center group",
                  inputText.trim() 
                    ? "bg-neon-cyan text-nav-bg hover:scale-105 active:scale-95 shadow-neon-cyan/20" 
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                <Send className={cn("w-6 h-6 ml-1 transition-transform", inputText.trim() && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5")} />
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
