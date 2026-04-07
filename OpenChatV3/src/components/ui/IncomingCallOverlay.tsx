import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, User, Sparkles } from 'lucide-react';
import { Call } from '../../types';
import { cn } from '../../lib/utils';

interface IncomingCallOverlayProps {
  call: Call | null;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({ call, onAccept, onReject }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (call) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
      audioRef.current.loop = true;
      audioRef.current.play().catch(err => console.error("Audio play failed:", err));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [call]);

  if (!call) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -120, opacity: 0, scale: 0.9 }}
        animate={{ y: 24, opacity: 1, scale: 1 }}
        exit={{ y: -120, opacity: 0, scale: 0.9 }}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-6"
      >
        <div className="bg-sidebar-bg/90 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl p-5 flex items-center justify-between gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-neon-purple/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center gap-4 overflow-hidden relative z-10">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800 border border-white/10 shadow-lg flex-shrink-0">
                {call.callerPhoto ? (
                  <img src={call.callerPhoto} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-7 h-7 text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neon-cyan rounded-lg flex items-center justify-center shadow-lg">
                <Sparkles className="w-3 h-3 text-nav-bg" />
              </div>
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-white truncate text-lg tracking-tight">{call.callerName}</h3>
              <p className="text-[11px] font-bold text-neon-cyan uppercase tracking-widest animate-pulse">
                Incoming {call.type} call...
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={onReject}
              className="w-12 h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all flex items-center justify-center shadow-lg border border-red-500/20"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            <button
              onClick={onAccept}
              className="w-14 h-14 bg-neon-cyan text-nav-bg rounded-2xl transition-all flex items-center justify-center shadow-xl shadow-neon-cyan/20 animate-bounce hover:scale-105 active:scale-95"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCallOverlay;
