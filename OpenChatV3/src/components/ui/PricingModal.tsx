import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Sparkles, Zap, Shield, Crown, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { userData, user } = useAuthStore();
  const [loading, setLoading] = React.useState(false);

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });
      
      const order = await response.json();
      
      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "QuickChat Pro",
        description: "Upgrade to Pro for unlimited AI and premium themes",
        image: "https://api.dicebear.com/7.x/bottts/svg?seed=QuickChat",
        order_id: order.id,
        handler: function (response: any) {
          onClose();
        },
        prefill: {
          name: userData?.username,
          email: userData?.email,
        },
        theme: {
          color: "#00f2ff",
        },
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-4xl bg-sidebar-bg rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10"
        >
          {/* Left Side: Visual/Marketing */}
          <div className="md:w-5/12 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 p-10 text-white flex flex-col justify-between relative overflow-hidden border-r border-white/5">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:30px_30px]"></div>
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Crown className="w-8 h-8 text-neon-cyan" />
              </div>
              <h2 className="text-4xl font-bold mb-6 leading-tight tracking-tight text-glow-cyan">Elevate Your Experience</h2>
              <p className="text-zinc-400 text-lg font-medium leading-relaxed">Unlock the full power of QuickChat with our Premium features.</p>
            </div>

            <div className="relative z-10 space-y-6">
              {[
                { icon: Sparkles, text: "Unlimited AI Assistant", color: "text-neon-cyan" },
                { icon: Zap, text: "Premium Themes & Styles", color: "text-neon-purple" },
                { icon: Shield, text: "Ad-Free Experience", color: "text-neon-pink" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
                    <item.icon className={cn("w-5 h-5", item.color)} />
                  </div>
                  <span className="font-bold text-zinc-300 tracking-wide">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Pricing Options */}
          <div className="md:w-7/12 p-10 bg-sidebar-bg relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2.5 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-10">
              <h3 className="text-3xl font-bold text-white tracking-tight">Choose Your Plan</h3>
              <p className="text-zinc-500 text-sm mt-2 font-bold uppercase tracking-widest">Simple pricing for everyone</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Free Plan */}
              <div className="p-6 rounded-3xl border border-white/5 bg-white/5 flex items-center justify-between opacity-40 grayscale">
                <div>
                  <h4 className="font-bold text-white text-xl">Standard</h4>
                  <p className="text-zinc-500 text-sm font-medium">Basic features</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">$0</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Forever</div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="p-8 rounded-[32px] border-2 border-neon-cyan bg-neon-cyan/5 shadow-2xl shadow-neon-cyan/10 flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-neon-cyan text-nav-bg text-[10px] font-bold uppercase tracking-widest rounded-bl-2xl shadow-lg">
                  Popular
                </div>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-neon-cyan/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="relative z-10">
                  <h4 className="font-bold text-white text-2xl flex items-center gap-3">
                    Pro
                    <Sparkles className="w-6 h-6 text-neon-cyan" />
                  </h4>
                  <p className="text-zinc-400 text-sm font-medium mt-1">Unlock everything</p>
                </div>
                <div className="text-right relative z-10">
                  <div className="text-4xl font-bold text-white tracking-tight">$4.99</div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Per Month</div>
                </div>
              </div>
            </div>

            <div className="mt-12 space-y-6">
              <button 
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-5 bg-neon-cyan hover:bg-neon-cyan/90 disabled:bg-zinc-800 disabled:text-zinc-600 text-nav-bg font-bold rounded-[20px] transition-all shadow-xl shadow-neon-cyan/20 flex items-center justify-center gap-3 active:scale-95"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  userData?.isPremium ? 'Manage Subscription' : 'Upgrade to Pro Now'
                )}
              </button>
              <p className="text-center text-[11px] text-zinc-500 px-12 leading-relaxed font-medium">
                By upgrading, you agree to our <span className="text-neon-cyan cursor-pointer">Terms of Service</span> and <span className="text-neon-cyan cursor-pointer">Privacy Policy</span>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PricingModal;
