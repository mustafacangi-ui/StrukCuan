import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Star, Sparkles } from "lucide-react";

interface DailyGiftCelebrationModalProps {
  visible: boolean;
  userName: string;
  onClose: () => void;
}

export function DailyGiftCelebrationModal({ visible, userName, onClose }: DailyGiftCelebrationModalProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [opened, setOpened] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible) {
      setIsOpening(false);
      setOpened(false);
      setShowReward(false);
    }
  }, [visible]);

  const handleOpen = () => {
    if (isOpening || opened) return;
    setIsOpening(true);

    // Shake sequence starts
    setTimeout(() => {
      setOpened(true);
      if (canvasRef.current) {
        fireConfetti(canvasRef.current);
      }
      // Reveal reward slightly after opening
      setTimeout(() => setShowReward(true), 400);
    }, 800); // Shake duration before lid pops
  };

  const fireConfetti = (canvas: HTMLCanvasElement) => {
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true });
    const colors = ["#a855f7", "#7c3aed", "#ec4899", "#d946ef", "#ffffff"];

    const isLarge = window.innerWidth > 768;
    myConfetti({
      particleCount: isLarge ? 200 : 120,
      spread: isLarge ? 120 : 90,
      origin: { x: 0.5, y: 0.45 },
      colors,
      startVelocity: isLarge ? 45 : 35,
      gravity: 0.8,
      ticks: 300,
      shapes: ['star', 'circle'],
    });

    // Side blasts
    setTimeout(() => {
      myConfetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
      myConfetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
    }, 200);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050510]/95 backdrop-blur-3xl overflow-hidden"
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none z-50" />

          {/* Animated Background Atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Radial base glow */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)]" />
             
             {/* Dynamic Light Bursts when opened */}
             <AnimatePresence>
                {opened && (
                   <>
                      <motion.div
                         initial={{ scale: 0, opacity: 0 }}
                         animate={{ scale: [1, 2.5], opacity: [0, 0.6, 0] }}
                         transition={{ duration: 1.5, ease: "easeOut" }}
                         className="absolute inset-0 flex items-center justify-center"
                      >
                         <div className="h-96 w-96 rounded-full bg-purple-500 blur-[120px]" />
                      </motion.div>
                      <motion.div
                         initial={{ opacity: 0, rotate: 0 }}
                         animate={{ opacity: [0, 1, 0], rotate: 180 }}
                         transition={{ duration: 2, ease: "easeOut" }}
                         className="absolute inset-0 flex items-center justify-center overflow-hidden"
                      >
                         <div className="absolute h-[250%] w-20 bg-gradient-to-b from-transparent via-white/20 to-transparent rotate-0 blur-xl" />
                         <div className="absolute h-[250%] w-20 bg-gradient-to-b from-transparent via-white/20 to-transparent rotate-45 blur-xl" />
                         <div className="absolute h-[250%] w-20 bg-gradient-to-b from-transparent via-white/20 to-transparent rotate-90 blur-xl" />
                         <div className="absolute h-[250%] w-20 bg-gradient-to-b from-transparent via-white/20 to-transparent rotate-135 blur-xl" />
                      </motion.div>
                   </>
                )}
             </AnimatePresence>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg px-6 text-center">
            
            {/* Header Section */}
            {!opened && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8 space-y-2"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                   <div className="h-px w-8 bg-purple-500/50" />
                   <Sparkles className="text-purple-400" size={16} />
                   <div className="h-px w-8 bg-purple-500/50" />
                </div>
                <h3 className="text-purple-400 font-bold tracking-[0.3em] uppercase text-xs md:text-sm">
                  DAILY REWARD
                </h3>
                <h2 className="text-3xl md:text-4xl font-black text-white italic tracking-tight">
                  HADIAH HARIAN
                </h2>
              </motion.div>
            )}

            {/* Main Stage: Gift Box */}
            <div 
              className="relative h-64 w-64 md:h-80 md:w-80 flex items-center justify-center perspective-1000"
              onClick={handleOpen}
            >
              {/* Box Glow */}
              <motion.div
                animate={{ 
                   scale: isOpening ? [1, 1.2, 1.1] : [1, 1.1, 1],
                   opacity: isOpening ? [0.3, 0.8, 0.6] : [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute h-48 w-48 md:h-64 md:w-64 rounded-full bg-purple-600/30 blur-[60px]"
              />

              {/* 3D-ish Box Container */}
              <motion.div
                animate={
                   opened 
                   ? { scale: 1.1 } 
                   : isOpening 
                      ? { 
                          x: [0, -10, 10, -10, 10, 0],
                          y: [0, -5, -5, -5, -5, 0],
                          rotate: [0, -5, 5, -5, 5, 0],
                        }
                      : { 
                          y: [0, -15, 0],
                          rotateY: [0, 10, 0, -10, 0] 
                        }
                }
                transition={
                   isOpening 
                   ? { duration: 0.6, times: [0, 0.1, 0.3, 0.5, 0.7, 1] } 
                   : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }
                className="relative z-20 transition-all duration-500 cursor-pointer group preserve-3d"
              >
                {/* Reward Card Reveal Animation */}
                <AnimatePresence>
                   {showReward && (
                      <motion.div
                         initial={{ y: 50, scale: 0.5, opacity: 0, rotate: -10 }}
                         animate={{ y: -80, scale: 1.2, opacity: 1, rotate: 0 }}
                         className="absolute -top-12 inset-x-0 mx-auto z-[60] flex flex-col items-center"
                      >
                         <div className="relative group">
                            {/* Card Background with Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="relative h-44 w-32 md:h-56 md:w-40 rounded-2xl bg-zinc-900 border-2 border-white/20 p-4 flex flex-col items-center justify-between shadow-2xl overflow-hidden backdrop-blur-xl">
                               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent)]" />
                               
                               <div className="flex flex-col items-center gap-1 mt-2">
                                  <div className="p-2 bg-white/5 rounded-xl border border-white/10 glass-morphism">
                                     <Sparkles className="text-yellow-400" size={24} />
                                  </div>
                                  <span className="text-[10px] font-bold text-white/40 tracking-tighter uppercase">REWARD CLAIMED</span>
                               </div>

                               <div className="flex flex-col items-center mb-4">
                                  <span className="text-5xl md:text-6xl font-black text-white leading-none drop-shadow-2xl">+1</span>
                                  <span className="text-xs font-bold text-white tracking-[0.2em] uppercase">TIKET</span>
                               </div>

                               <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                     initial={{ width: 0 }}
                                     animate={{ width: "100%" }}
                                     transition={{ delay: 0.6, duration: 0.8 }}
                                     className="h-full bg-gradient-to-r from-pink-500 to-purple-500" 
                                  />
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>

                {/* Box Lid */}
                <motion.div
                  initial={false}
                  animate={opened ? { y: -300, x: 200, rotate: 45, opacity: 0 } : {}}
                  transition={{ duration: 0.8, ease: "circOut" }}
                  className="absolute left-1/2 -top-6 -translate-x-1/2 z-30 h-10 w-[110%] bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl shadow-2xl border-b border-white/10"
                >
                   {/* Ribbons on Lid */}
                   <div className="absolute left-1/2 inset-y-0 w-8 md:w-10 bg-pink-500 -translate-x-1/2 border-x border-black/10" />
                   <div className="absolute top-1/2 inset-x-0 h-4 md:h-6 bg-pink-500/80 -translate-y-1/2 border-y border-black/10" />
                   
                   {/* Bow */}
                   <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-end">
                      <div className="h-6 w-8 rounded-full bg-pink-400 border border-pink-300 -rotate-12 translate-x-1" />
                      <div className="h-6 w-8 rounded-full bg-pink-400 border border-pink-300 rotate-12 -translate-x-1" />
                   </div>
                </motion.div>

                {/* Box Body */}
                <div className="relative h-32 w-32 md:h-44 md:w-44 bg-gradient-to-br from-indigo-700 to-purple-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden">
                   {/* Ribbons on Body */}
                   <div className="absolute left-1/2 inset-y-0 w-8 md:w-10 bg-pink-600 -translate-x-1/2 border-x border-black/20" />
                   
                   {/* Inner Shadow for depth */}
                   <div className="absolute inset-x-0 top-0 h-4 bg-black/40 blur-sm" />
                   
                   {/* Glass texture overlay */}
                   <div className="absolute inset-0 opacity-20 pointer-events-none" 
                        style={{ background: 'linear-gradient(135deg, white 0%, transparent 40%, black 100%)' }} />
                </div>
              </motion.div>

              {/* Tap to Open Hint */}
              {!isOpening && !opened && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute -bottom-16 inset-x-0"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-white/60 font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                  >
                     TAP TO OPEN
                     <motion.div 
                        animate={{ x: [0, 5, 0] }} 
                        transition={{ duration: 1, repeat: Infinity }}
                     >
                        🎁
                     </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Bottom Section: Success Message & Button */}
            <AnimatePresence>
               {showReward && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-16 md:mt-24 space-y-6"
                  >
                     <div className="space-y-1">
                        <p className="text-purple-400 font-bold uppercase tracking-widest text-sm">
                           CONGRATULATIONS!
                        </p>
                        <h4 className="text-2xl font-bold text-white">
                           {userName}, kamu beruntung!
                        </h4>
                        <p className="text-white/40 text-sm italic">
                           Tiket telah ditambahkan ke saldo anda. ✨
                        </p>
                     </div>

                     <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="relative group px-12 py-4 rounded-2xl overflow-hidden shadow-2xl transition-all"
                     >
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative text-white font-black tracking-widest uppercase text-sm md:text-lg">
                           AWESOME! 🚀
                        </span>
                     </motion.button>
                  </motion.div>
               )}
            </AnimatePresence>
          </div>

          {/* Sparkle Particles Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {[...Array(25)].map((_, i) => (
                <motion.div
                   key={i}
                   className="absolute"
                   style={{
                      left: Math.random() * 100 + "%",
                      top: Math.random() * 100 + "%",
                   }}
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ 
                      scale: [0, Math.random() * 1.5, 0],
                      opacity: [0, 0.4, 0],
                      y: [0, -100 - Math.random() * 200]
                   }}
                   transition={{ 
                      duration: 3 + Math.random() * 5, 
                      repeat: Infinity, 
                      delay: Math.random() * 5 
                   }}
                >
                   {i % 2 === 0 ? (
                      <Star size={Math.random() * 10 + 5} className="text-white fill-white opacity-20" />
                   ) : (
                      <div className="h-1 w-1 bg-purple-400 rounded-full blur-[1px]" />
                   )}
                </motion.div>
             ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
