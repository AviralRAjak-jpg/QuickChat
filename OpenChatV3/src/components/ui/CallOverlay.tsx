import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { auth, db } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Loader2, 
  Video, 
  VideoOff,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { doc, onSnapshot, collection, addDoc } from 'firebase/firestore';

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  call: any;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const CallOverlay: React.FC<CallOverlayProps> = ({ isOpen, onClose, call }) => {
  const { 
    activeConversation, 
    sendOffer, 
    sendAnswer, 
    addIceCandidate,
    endCall 
  } = useChatStore();
  
  const otherUser = activeConversation?.otherUser;
  const isAI = call.receiverId === 'ai-assistant' || call.callerId === 'ai-assistant';
  const isCaller = call.callerId === auth.currentUser?.uid;
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(call.type === 'voice');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>(call.status);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setupCall();
      return () => {
        cleanupCall();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setStatus(call.status);
    if (call.status === 'connected' && !timerRef.current) {
      startTimer();
    }
  }, [call.status]);

  const setupCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.type === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addIceCandidate(call.id, event.candidate, isCaller ? 'caller' : 'receiver');
        }
      };

      if (isCaller) {
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);
        await sendOffer(call.id, offerDescription);

        onSnapshot(doc(db, 'calls', call.id), (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
          }
        });
      } else {
        onSnapshot(doc(db, 'calls', call.id), async (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data?.offer) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.setRemoteDescription(offerDescription);

            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
            await sendAnswer(call.id, answerDescription);
          }
        });
      }

      const candidateCollection = isCaller ? 'receiverCandidates' : 'callerCandidates';
      onSnapshot(collection(db, `calls/${call.id}/${candidateCollection}`), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            pc.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      });

    } catch (error) {
      console.error("WebRTC Setup Error:", error);
      endCall();
    }
  };

  const cleanupCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-nav-bg flex flex-col items-center justify-between overflow-hidden"
      >
        {/* Video Backgrounds */}
        <div className="absolute inset-0 z-0">
          {call.type === 'video' ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <motion.div 
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                className="absolute top-8 right-8 w-40 h-60 bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/10 z-10"
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-zinc-700" />
                  </div>
                )}
              </motion.div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-nav-bg via-sidebar-bg to-nav-bg flex flex-col items-center justify-center pt-20">
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: call.status === 'ringing' ? [1, 1.05, 1] : 1,
                    boxShadow: call.status === 'ringing' ? ["0 0 0 0px rgba(0, 242, 255, 0)", "0 0 0 30px rgba(0, 242, 255, 0.1)", "0 0 0 0px rgba(0, 242, 255, 0)"] : "none"
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-40 h-40 rounded-[48px] overflow-hidden border-4 border-neon-cyan/20 shadow-2xl relative"
                >
                  <img 
                    src={(isCaller ? call.receiverPhoto : call.callerPhoto) || 'https://ui-avatars.com/api/?name=User'} 
                    className="w-full h-full object-cover"
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </motion.div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-neon-cyan rounded-2xl flex items-center justify-center shadow-xl shadow-neon-cyan/20">
                  <Phone className="w-6 h-6 text-nav-bg" />
                </div>
              </div>
              <div className="mt-12 text-center">
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight text-glow-cyan">
                  {(isCaller ? call.receiverName : call.callerName) || 'User'}
                </h2>
                <div className="flex flex-col items-center gap-2">
                  <p className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.2em]",
                    call.status === 'connected' ? "text-neon-cyan" : "text-zinc-500"
                  )}>
                    {call.status === 'ringing' && 'Establishing Connection...'}
                    {call.status === 'connected' && 'Secure Connection Active'}
                    {call.status === 'ended' && 'Session Terminated'}
                  </p>
                  {call.status === 'connected' && (
                    <span className="text-2xl font-mono text-white tracking-widest">
                      {formatTime(callDuration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Overlay Info */}
        {call.type === 'video' && (
          <div className="absolute top-8 left-8 z-10 flex items-center gap-4 bg-black/40 backdrop-blur-xl p-3 pr-6 rounded-2xl border border-white/10 shadow-2xl">
            <img 
              src={(isCaller ? call.receiverPhoto : call.callerPhoto) || 'https://ui-avatars.com/api/?name=User'} 
              className="w-10 h-10 rounded-xl object-cover border border-white/10"
              alt=""
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-sm font-bold text-white tracking-tight">{(isCaller ? call.receiverName : call.callerName)}</p>
              <p className="text-[10px] font-bold text-neon-cyan uppercase tracking-widest mt-0.5">{formatTime(callDuration)}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="relative z-10 w-full max-w-lg px-8 pb-16 mt-auto">
          <div className="bg-sidebar-bg/80 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 flex flex-col gap-10 shadow-2xl">
            <div className="flex items-center justify-around w-full">
              <button 
                onClick={toggleMute}
                className={cn(
                  "w-16 h-16 rounded-2xl transition-all flex items-center justify-center shadow-lg",
                  isMuted 
                    ? "bg-white text-nav-bg scale-110" 
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                )}
              >
                {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>

              {call.type === 'video' && (
                <button 
                  onClick={toggleVideo}
                  className={cn(
                    "w-16 h-16 rounded-2xl transition-all flex items-center justify-center shadow-lg",
                    isVideoOff 
                      ? "bg-white text-nav-bg scale-110" 
                      : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                  )}
                >
                  {isVideoOff ? <VideoOff className="w-7 h-7" /> : <Video className="w-7 h-7" />}
                </button>
              )}
              
              <button 
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  "w-16 h-16 rounded-2xl transition-all flex items-center justify-center shadow-lg",
                  !isSpeakerOn 
                    ? "bg-white text-nav-bg scale-110" 
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                )}
              >
                {isSpeakerOn ? <Volume2 className="w-7 h-7" /> : <VolumeX className="w-7 h-7" />}
              </button>
            </div>

            <button 
              onClick={endCall}
              className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-5 flex items-center justify-center gap-4 shadow-2xl shadow-red-500/30 transition-all transform active:scale-95 font-bold text-lg"
            >
              <PhoneOff className="w-7 h-7" />
              Disconnect
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CallOverlay;
