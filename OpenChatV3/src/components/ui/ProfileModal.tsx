import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  User, 
  Check, 
  Loader2,
  Type,
  Info,
  Sparkles
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { cn } from '../../lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { userData, updateProfileData } = useAuthStore();
  const [username, setUsername] = useState(userData?.username || '');
  const [status, setStatus] = useState(userData?.status || '');
  const [bio, setBio] = useState(userData?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!username.trim()) return;
    setIsSaving(true);
    try {
      await updateProfileData({
        username,
        username_lowercase: username.toLowerCase(),
        status,
        bio
      });
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.uid) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large (max 5MB)');
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${userData.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);
      await updateProfileData({ photoURL });
    } catch (error) {
      console.error('Failed to upload photo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-sidebar-bg w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                <User className="w-5 h-5 text-neon-cyan" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Profile Settings</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-colors text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {/* Photo Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-36 h-36 rounded-[40px] overflow-hidden border-4 border-white/5 shadow-2xl relative">
                  {isUploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Loader2 className="w-10 h-10 animate-spin text-neon-cyan" />
                    </div>
                  ) : (
                    <img 
                      src={userData?.photoURL || 'https://ui-avatars.com/api/?name=User'} 
                      className="w-full h-full object-cover"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-2 -right-2 p-3.5 bg-neon-cyan text-nav-bg rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 shadow-neon-cyan/20"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-zinc-500">
                <Sparkles className="w-3 h-3 text-neon-cyan" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Avatar Customization</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-500 tracking-widest ml-1">
                  <Type className="w-3.5 h-3.5 text-neon-cyan" />
                  Display Name
                </label>
                <div className="relative group">
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your unique handle"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-[15px] text-white focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-500 tracking-widest ml-1">
                  <Info className="w-3.5 h-3.5 text-neon-purple" />
                  Status Message
                </label>
                <input 
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="What's happening?"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-[15px] text-white focus:outline-none focus:border-neon-purple/50 focus:bg-white/10 transition-all placeholder:text-zinc-700"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-500 tracking-widest ml-1">
                  <Info className="w-3.5 h-3.5 text-neon-pink" />
                  About Me
                </label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short story about you..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-[15px] text-white focus:outline-none focus:border-neon-pink/50 focus:bg-white/10 transition-all placeholder:text-zinc-700 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 bg-white/5 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={isSaving || isUploading || !username.trim()}
              className="w-full bg-neon-cyan hover:bg-neon-cyan/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-nav-bg font-bold py-4.5 rounded-2xl shadow-xl shadow-neon-cyan/20 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              Update Profile
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileModal;
