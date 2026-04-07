import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Settings, 
  MessageSquare, 
  Users, 
  Plus, 
  ChevronLeft, 
  Check, 
  Sparkles, 
  LogOut, 
  Crown, 
  Palette,
  Moon,
  Sun,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import { cn } from '../../lib/utils';
import { UserData, Conversation } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import PricingModal from '../ui/PricingModal';
import ProfileModal from '../ui/ProfileModal';

interface ConversationItemProps {
  conv: Conversation;
  activeConversationId?: string;
  userData: UserData | null;
  setActiveConversation: (conv: Conversation) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = React.memo(({ 
  conv, 
  activeConversationId, 
  userData, 
  setActiveConversation 
}) => {
  const isActive = activeConversationId === conv.id;
  const otherUser = conv.otherUser;
  const isGroup = conv.type === 'group';
  const myUnreadCount = userData?.uid ? (conv.unreadCount?.[userData.uid] || 0) : 0;
  
  return (
    <button
      onClick={() => setActiveConversation(conv)}
      className={cn(
        "w-full px-3 py-3 flex items-center gap-3 transition-all relative group rounded-xl mb-0.5",
        isActive 
          ? "bg-white/10 shadow-lg shadow-black/20" 
          : "hover:bg-white/5"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="active-pill"
          className="absolute left-0 w-1 h-8 bg-neon-cyan rounded-r-full"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      
      <div className="relative flex-shrink-0">
        {isGroup ? (
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
            <Users className="w-6 h-6 text-zinc-400" />
          </div>
        ) : (
          <>
            <img 
              src={otherUser?.photoURL || 'https://ui-avatars.com/api/?name=User'} 
              className="w-12 h-12 rounded-xl object-cover border border-white/5" 
              alt="" 
              referrerPolicy="no-referrer"
            />
            {otherUser?.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-cyan border-2 border-sidebar-bg rounded-full shadow-lg shadow-neon-cyan/20"></div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 text-left overflow-hidden">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className={cn(
            "font-bold text-[15px] truncate transition-colors",
            isActive ? "text-white" : "text-zinc-300 group-hover:text-white"
          )}>
            {isGroup ? conv.name : otherUser?.username}
          </h4>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-zinc-500 font-medium">
              {format(conv.lastMessageAt.toDate(), 'HH:mm')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className={cn(
            "text-[12px] truncate max-w-[180px]",
            isActive ? "text-zinc-300" : "text-zinc-500"
          )}>
            {conv.lastMessage || 'No messages yet'}
          </p>
          {myUnreadCount > 0 ? (
            <span className="bg-neon-cyan text-nav-bg text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {myUnreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
});

ConversationItem.displayName = 'ConversationItem';

const SidebarSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="w-12 h-12 bg-zinc-800 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const Sidebar: React.FC = () => {
  const { userData, logout, theme, setTheme, setPremiumTheme } = useAuthStore();
  const { 
    conversations, 
    activeConversation, 
    setActiveConversation, 
    searchUsers, 
    createPrivateChat,
    createGroupChat,
    conversationsLoading 
  } = useChatStore();
  const [activeTab, setActiveTab] = useState<'chats' | 'people' | 'settings'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [friends, setFriends] = useState<UserData[]>([]);

  const totalUnread = useMemo(() => {
    if (!userData?.uid) return 0;
    return conversations.reduce((acc, conv) => acc + (conv.unreadCount?.[userData.uid] || 0), 0);
  }, [conversations, userData?.uid]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim() || activeTab !== 'chats') return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.otherUser?.username?.toLowerCase().includes(query) || 
      c.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery, activeTab]);

  useEffect(() => {
    if (searchQuery.trim().length > 0 && activeTab === 'people') {
      const delayDebounceFn = setTimeout(async () => {
        setIsSearching(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter(u => u.uid !== userData?.uid));
        setIsSearching(false);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsers, userData?.uid, activeTab]);

  // Fetch friends (users we have chats with) for group creation
  useEffect(() => {
    if (showCreateGroup) {
      const uniqueUsers = new Map<string, UserData>();
      conversations.forEach(conv => {
        if (conv.otherUser && conv.otherUser.uid !== 'ai-assistant') {
          uniqueUsers.set(conv.otherUser.uid, conv.otherUser);
        }
      });
      setFriends(Array.from(uniqueUsers.values()));
    }
  }, [showCreateGroup, conversations]);

  const handleStartChat = async (user: UserData) => {
    const conv = await createPrivateChat(user);
    setActiveConversation(conv);
    setSearchQuery('');
    setActiveTab('chats');
  };

  const aiAssistant: UserData = {
    uid: 'ai-assistant',
    username: 'QuickChat AI',
    email: 'ai@quickchat.com',
    photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=QuickChat',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: null as any
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;
    
    try {
      const newGroup = await createGroupChat(groupName, selectedParticipants);
      setActiveConversation(newGroup);
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedParticipants([]);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="w-full md:w-[420px] h-full flex overflow-hidden bg-nav-bg">
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Pane 1: Narrow Navigation (Discord Style) */}
      <div className="w-[72px] h-full flex flex-col items-center py-4 gap-4 bg-nav-bg border-r border-white/5">
        <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 flex items-center justify-center mb-2 group cursor-pointer transition-all hover:rounded-xl">
          <Sparkles className="w-6 h-6 text-neon-cyan group-hover:scale-110 transition-transform" />
        </div>
        
        <div className="w-8 h-[2px] bg-white/10 rounded-full mb-2" />

        <button 
          onClick={() => setActiveTab('chats')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group",
            activeTab === 'chats' ? "bg-neon-cyan text-nav-bg rounded-xl shadow-lg shadow-neon-cyan/20" : "text-zinc-500 hover:bg-white/5 hover:text-white hover:rounded-xl"
          )}
        >
          <MessageSquare className="w-6 h-6" />
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-nav-bg">
              {totalUnread > 9 ? '9+' : totalUnread}
            </div>
          )}
          {activeTab === 'chats' && <div className="absolute -left-1 w-1 h-8 bg-neon-cyan rounded-r-full" />}
        </button>

        <button 
          onClick={() => setActiveTab('people')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group",
            activeTab === 'people' ? "bg-neon-purple text-white rounded-xl shadow-lg shadow-neon-purple/20" : "text-zinc-500 hover:bg-white/5 hover:text-white hover:rounded-xl"
          )}
        >
          <Users className="w-6 h-6" />
          {activeTab === 'people' && <div className="absolute -left-1 w-1 h-8 bg-neon-purple rounded-r-full" />}
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group",
            activeTab === 'settings' ? "bg-neon-pink text-white rounded-xl shadow-lg shadow-neon-pink/20" : "text-zinc-500 hover:bg-white/5 hover:text-white hover:rounded-xl"
          )}
        >
          <Settings className="w-6 h-6" />
          {activeTab === 'settings' && <div className="absolute -left-1 w-1 h-8 bg-neon-pink rounded-r-full" />}
        </button>

        <div className="mt-auto flex flex-col items-center gap-4">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-transparent hover:border-neon-cyan transition-all group"
          >
            <img 
              src={userData?.photoURL || 'https://ui-avatars.com/api/?name=User'} 
              className="w-full h-full object-cover" 
              alt="" 
              referrerPolicy="no-referrer"
            />
          </button>
          
          <button 
            onClick={logout}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all hover:rounded-xl"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Pane 2: Content List */}
      <div className="flex-1 h-full flex flex-col bg-sidebar-bg">
        {/* Sub-header */}
        <div className="px-4 py-5 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white capitalize">
            {activeTab}
          </h2>
          {activeTab === 'chats' && (
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-neon-cyan"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-neon-cyan w-4 h-4 transition-colors" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-nav-bg/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-nav-bg transition-all placeholder:text-zinc-600"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {showCreateGroup ? (
              <motion.div
                key="create-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button 
                    onClick={() => setShowCreateGroup(false)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-bold">New Group</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider ml-1">Group Name</label>
                    <input 
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="w-full bg-nav-bg border border-white/5 rounded-xl py-3 px-4 text-sm focus:border-neon-cyan/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider ml-1">Select Participants</label>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {friends.map(friend => (
                        <button
                          key={friend.uid}
                          onClick={() => toggleParticipant(friend.uid)}
                          className={cn(
                            "w-full p-2.5 flex items-center gap-3 rounded-xl transition-all border border-transparent",
                            selectedParticipants.includes(friend.uid) 
                              ? "bg-neon-cyan/10 border-neon-cyan/20" 
                              : "hover:bg-white/5"
                          )}
                        >
                          <img src={friend.photoURL || 'https://ui-avatars.com/api/?name=User'} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-sm">{friend.username}</p>
                            <p className="text-[11px] text-zinc-500">{friend.isOnline ? 'Online' : 'Offline'}</p>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                            selectedParticipants.includes(friend.uid)
                              ? "bg-neon-cyan border-neon-cyan"
                              : "border-zinc-700"
                          )}>
                            {selectedParticipants.includes(friend.uid) && <Check className="w-3 h-3 text-nav-bg" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedParticipants.length === 0}
                    className="w-full bg-neon-cyan hover:bg-neon-cyan/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-nav-bg font-bold py-3.5 rounded-xl shadow-lg shadow-neon-cyan/20 transition-all active:scale-95"
                  >
                    Create Group
                  </button>
                </div>
              </motion.div>
            ) : activeTab === 'chats' ? (
              <motion.div
                key="chats"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-2 space-y-0.5"
              >
                {/* AI Assistant Pin */}
                <button
                  onClick={() => handleStartChat(aiAssistant)}
                  className="w-full px-3 py-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center shadow-lg shadow-neon-cyan/20">
                      <Sparkles className="text-white w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-neon-cyan border-2 border-sidebar-bg rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left overflow-hidden relative">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-bold text-[15px] text-white">QuickChat AI</h4>
                      <span className="text-[10px] bg-neon-cyan/10 text-neon-cyan px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">AI</span>
                    </div>
                    <p className="text-[12px] text-zinc-500 truncate">Ask me anything!</p>
                  </div>
                </button>

                {conversationsLoading ? (
                  <SidebarSkeleton />
                ) : (
                  filteredConversations.map(conv => (
                    <ConversationItem 
                      key={conv.id}
                      conv={conv}
                      activeConversationId={activeConversation?.id}
                      userData={userData}
                      setActiveConversation={setActiveConversation}
                    />
                  ))
                )}
              </motion.div>
            ) : activeTab === 'people' ? (
              <motion.div
                key="people"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-2 space-y-0.5"
              >
                {searchResults.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => handleStartChat(user)}
                    className="w-full px-3 py-3 flex items-center gap-3 hover:bg-white/5 rounded-xl transition-all"
                  >
                    <img src={user.photoURL || 'https://ui-avatars.com/api/?name=User'} className="w-11 h-11 rounded-xl object-cover border border-white/5" alt="" referrerPolicy="no-referrer" />
                    <div className="text-left">
                      <h4 className="font-bold text-[15px] text-white">{user.username}</h4>
                      <p className="text-[11px] text-zinc-500">{user.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-6"
              >
                <div className="space-y-4">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Preferences</div>
                  
                  <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-full p-4 bg-nav-bg/50 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-nav-bg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                        {theme === 'dark' ? <Moon className="w-5 h-5 text-neon-purple" /> : <Sun className="w-5 h-5 text-amber-500" />}
                      </div>
                      <span className="text-sm font-bold text-white">Dark Mode</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full transition-all relative p-1",
                      theme === 'dark' ? 'bg-neon-cyan' : 'bg-zinc-700'
                    )}>
                      <div className={cn(
                        "w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                        theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                      )}></div>
                    </div>
                  </button>

                  {userData?.isPremium && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Palette className="w-4 h-4 text-neon-pink" />
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Premium Themes</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: '', name: 'Default', color: 'bg-zinc-900' },
                          { id: 'midnight', name: 'Midnight', color: 'bg-[#020617]' },
                          { id: 'sunset', name: 'Sunset', color: 'bg-[#450a0a]' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setPremiumTheme(t.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                              userData.premiumTheme === t.id 
                                ? "border-neon-pink bg-neon-pink/10" 
                                : "border-white/5 hover:border-white/20"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-full border border-white/10", t.color)}></div>
                            <span className="text-[10px] font-bold text-zinc-400">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
