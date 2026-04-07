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

    myConfetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.5, y: 0.4 },
      colors,
      startVelocity: 35,
      ticks: 200,
      gravity: 1.2,
    });

    setTimeout(() => {
      myConfetti({ particleCount: 40, spread: 100, origin: { x: 0.3, y: 0.5 }, colors });
      myConfetti({ particleCount: 40, spread: 100, origin: { x: 0.7, y: 0.5 }, colors });
    }, 200);
  };

  const lidVariants = {
    closed: { y: 0, rotate: 0, opacity: 1 },
    open: { 
      y: -100, 
      rotate: -30, 
      scale: 0.4, 
      opacity: 0,
      transition: { 
        duration: 0.5, 
        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] 
      } 
    },
  };

  const badgeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring" as const, 
        damping: 8, 
        stiffness: 200 
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl"
          onClick={onClose}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />

          {/* Gift Stage */}
          <div className="flex flex-col items-center gap-8 px-6 text-center">
            <div className="relative h-40 w-40 sm:h-48 sm:w-48">
              {/* Glow ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-8 rounded-full bg-radial-gradient from-pink-500/30 via-purple-500/20 to-transparent blur-2xl"
              />

              {/* Gift box */}
              <motion.div
                animate={opened ? {} : { y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative mx-auto mt-8 h-28 w-28 group drop-shadow-[0_0_20px_rgba(244,114,182,0.5)]"
              >
                {/* Lid */}
                <motion.div
                  variants={lidVariants}
                  animate={opened ? "open" : "closed"}
                  className="absolute left-1/2 top-0 z-20 h-6 w-20 -translate-x-1/2 rounded-lg bg-gradient-to-br from-pink-400 to-purple-600 shadow-[0_4px_20px_rgba(244,114,182,0.4)]"
                />

                {/* Body */}
                <div className="absolute bottom-0 left-1/2 h-16 w-24 -translate-x-1/2 rounded-xl bg-gradient-to-br from-purple-700 to-purple-500 shadow-[0_8px_32px_rgba(124,58,237,0.5)]" />
              </motion.div>

              {/* +1 Ticket badge */}
              <AnimatePresence>
                {showBadge && (
                  <motion.div
                    variants={badgeVariants}
                    initial="hidden"
                    animate="visible"
                    className="absolute -right-2 -top-2 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-600 shadow-[0_0_30px_rgba(244,114,182,0.7),0_0_60px_rgba(244,114,182,0.3)] ring-2 ring-white/20"
                  >
                    <span className="text-3xl font-black text-white leading-none">+1</span>
                    <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase">Tiket</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text Content */}
            <AnimatePresence>
              {showText && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="flex flex-col gap-4"
                >
                  <p className="text-sm font-bold tracking-[0.2em] text-pink-400/90 uppercase">
                    Selamat datang kembali
                  </p>
                  <h2 className="font-display text-4xl font-black text-white drop-shadow-sm">
                    {userName}! 🎉
                  </h2>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-white/80 leading-relaxed">
                      Hadiah harian kamu<br />sudah masuk ke akun
                    </p>
                    <p className="text-xs font-medium text-white/40 italic">
                      Datang lagi besok untuk hadiah berikutnya ✨
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sparkles / Ambient particles (simulated via CSS) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {[...Array(6)].map((_, i) => (
                <motion.div
                   key={i}
                   className="absolute h-1 w-1 rounded-full bg-pink-400"
                   initial={{ 
                      x: Math.random() * 100 + "%", 
                      y: Math.random() * 100 + "%",
                      scale: 0,
                      opacity: 0 
                   }}
                   animate={{ 
                      scale: [0, 1.5, 0],
                      opacity: [0, 0.8, 0],
                      y: [null, "-=100"] 
                   }}
                   transition={{ 
                      duration: 2 + Math.random() * 2, 
                      repeat: Infinity, 
                      delay: Math.random() * 2 
                   }}
                />
             ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
