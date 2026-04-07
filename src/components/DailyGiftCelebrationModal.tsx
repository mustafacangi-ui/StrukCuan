import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

interface DailyGiftCelebrationModalProps {
  visible: boolean;
  userName: string;
  onClose: () => void;
}

export function DailyGiftCelebrationModal({ visible, userName, onClose }: DailyGiftCelebrationModalProps) {
  const [opened, setOpened] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showText, setShowText] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible) {
      setOpened(false);
      setShowBadge(false);
      setShowText(false);
      return;
    }

    // Auto-open gift after 1s
    const t1 = setTimeout(() => setOpened(true), 1000);

    // Confetti + badge after lid flies off
    const t2 = setTimeout(() => {
      if (canvasRef.current) {
        fireConfetti(canvasRef.current);
      }
      setShowBadge(true);
      setShowText(true);
    }, 1600);

    // Auto-close after ~3.8s
    const t3 = setTimeout(() => onClose(), 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [visible, onClose]);

  const fireConfetti = (canvas: HTMLCanvasElement) => {
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true });
    const colors = ["#f472b6", "#a855f7", "#7c3aed", "#ec4899", "#c084fc"];

    // Initial burst
    myConfetti({
      particleCount: 150,
      spread: 80,
      origin: { x: 0.5, y: 0.4 },
      colors,
      startVelocity: 45,
      ticks: 300,
      gravity: 1,
    });

    // Side blasts for density
    setTimeout(() => {
      myConfetti({ particleCount: 60, spread: 120, origin: { x: 0.3, y: 0.45 }, colors });
      myConfetti({ particleCount: 60, spread: 120, origin: { x: 0.7, y: 0.45 }, colors });
    }, 200);
  };

  const lidVariants = {
    closed: { y: 0, rotate: 0, opacity: 1 },
    open: { 
      y: -150, 
      rotate: -45, 
      scale: 0.2, 
      opacity: 0,
      transition: { 
        duration: 0.6, 
        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] 
      } 
    },
  };

  const badgeVariants = {
    hidden: { scale: 0, opacity: 0, rotate: -20 },
    visible: { 
      scale: 1, 
      opacity: 1,
      rotate: 0,
      transition: { 
        type: "spring" as const, 
        damping: 10, 
        stiffness: 300 
      } 
    },
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl"
          onClick={onClose}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />

          {/* Background Radial Light Burst */}
          <AnimatePresence>
             {opened && (
                <motion.div
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 3.5, opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.8, ease: "easeOut" }}
                   className="absolute h-64 w-64 rounded-full bg-radial-gradient from-purple-500/40 via-pink-400/10 to-transparent blur-3xl pointer-events-none"
                />
             )}
          </AnimatePresence>

          {/* Gift Stage */}
          <div className="flex flex-col items-center gap-0 px-6 text-center">
            <div className="relative h-48 w-48 sm:h-56 sm:w-56 flex items-center justify-center">
              
              {/* Glow ring under the box */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute h-32 w-32 rounded-full bg-purple-500/20 blur-3xl"
              />

              {/* Gift box */}
              <motion.div
                animate={opened ? {} : { y: [0, -12, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative h-32 w-32 group drop-shadow-[0_0_35px_rgba(244,114,182,0.4)]"
              >
                {/* Body */}
                <div className="absolute bottom-0 left-1/2 h-20 w-28 -translate-x-1/2 rounded-xl bg-gradient-to-br from-purple-800 to-purple-600 shadow-[inset_0_-4px_10px_rgba(0,0,0,0.3)] overflow-hidden">
                   {/* Vertical Ribbon */}
                   <div className="absolute left-1/2 top-0 bottom-0 w-6 -translate-x-1/2 bg-gradient-to-b from-pink-400 to-pink-600 shadow-sm" />
                </div>

                {/* Lid */}
                <motion.div
                  variants={lidVariants}
                  animate={opened ? "open" : "closed"}
                  className="absolute left-1/2 top-4 z-20 h-8 w-32 -translate-x-1/2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 shadow-md flex items-center justify-center"
                >
                   {/* Ribbon across lid */}
                   <div className="absolute left-1/2 top-0 bottom-0 w-6 -translate-x-1/2 bg-gradient-to-b from-pink-300 to-pink-500" />
                   
                   {/* Bow on top (simple CSS shape) */}
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5">
                      <div className="h-4 w-5 rounded-full bg-pink-400 rotate-12" />
                      <div className="h-4 w-5 rounded-full bg-pink-400 -rotate-12" />
                   </div>
                </motion.div>

                {/* +1 Ticket badge (Closer to box) */}
                <AnimatePresence>
                  {showBadge && (
                    <motion.div
                      variants={badgeVariants}
                      initial="hidden"
                      animate="visible"
                      className="absolute right-0 top-6 z-30 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-600 shadow-[0_0_40px_rgba(244,114,182,0.7)] ring-4 ring-white/10"
                    >
                      <span className="text-3xl font-black text-white leading-none">+1</span>
                      <span className="text-[10px] font-bold tracking-widest text-white/95 uppercase">Tiket</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Text Content (Tighter layout) */}
            <AnimatePresence>
              {showText && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex flex-col gap-2 -mt-4"
                >
                  <p className="text-sm font-bold tracking-[0.25em] text-pink-400/90 uppercase drop-shadow-lg">
                    Selamat datang kembali
                  </p>
                  <h2 className="font-display text-2xl font-bold text-white/80">
                    {userName}
                  </h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-lg font-black text-white leading-tight uppercase tracking-wide">
                      Hadiah harian kamu<br />telah diklaim! 🎁
                    </p>
                    <p className="text-xs font-semibold text-white/40 italic">
                      Datang lagi besok untuk hadiah berikutnya ✨
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sparkles / Ambient particles (Increased density) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {[...Array(12)].map((_, i) => (
                <motion.div
                   key={i}
                   className="absolute h-1 w-1 rounded-full bg-pink-300"
                   initial={{ 
                      x: Math.random() * 100 + "%", 
                      y: Math.random() * 100 + "%",
                      scale: 0,
                      opacity: 0 
                   }}
                   animate={{ 
                      scale: [0, 1.8, 0],
                      opacity: [0, 0.9, 0],
                      y: [null, "-=150"] 
                   }}
                   transition={{ 
                      duration: 2 + Math.random() * 2, 
                      repeat: Infinity, 
                      delay: Math.random() * 3 
                   }}
                />
             ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
