import React, { useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/layout/ChatWindow';
import CallOverlay from '../components/ui/CallOverlay';
import IncomingCallOverlay from '../components/ui/IncomingCallOverlay';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { cn } from '../lib/utils';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatPage: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    subscribeToConversations, 
    subscribeToCalls, 
    activeConversation,
    currentCall,
    incomingCall,
    endCall,
    acceptCall,
    rejectCall,
    error,
    setError
  } = useChatStore();

  useEffect(() => {
    if (user?.uid) {
      const unsubConvs = subscribeToConversations(user.uid);
      const unsubCalls = subscribeToCalls(user.uid);
      return () => {
        unsubConvs();
        unsubCalls();
      };
    }
  }, [user?.uid, subscribeToConversations, subscribeToCalls]);
  
  return (
    <div className="flex h-screen overflow-hidden bg-chat-bg text-zinc-100 font-sans relative">
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[200] w-full max-w-md px-4"
          >
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Action Failed</p>
                <p className="text-xs text-zinc-400">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Overlays */}
      <IncomingCallOverlay 
        call={incomingCall} 
        onAccept={acceptCall} 
        onReject={rejectCall} 
      />
      
      {currentCall && (
        <CallOverlay 
          isOpen={!!currentCall} 
          onClose={endCall} 
          call={currentCall}
        />
      )}

      <div className={cn(
        "flex-shrink-0 w-full md:w-[420px] h-full transition-all duration-500 ease-in-out",
        activeConversation ? "hidden md:block" : "block"
      )}>
        <Sidebar />
      </div>
      <div className={cn(
        "flex-1 h-full transition-all duration-500 ease-in-out",
        !activeConversation ? "hidden md:flex" : "flex"
      )}>
        <ChatWindow />
      </div>
    </div>
  );
};

export default ChatPage;
