'use client';

import { motion } from 'framer-motion';

export default function LoadingLogo() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Animated logo rotating/pulsing color filters */}
      <motion.div
        animate={{
          filter: [
            'hue-rotate(0deg) brightness(1)',
            'hue-rotate(90deg) brightness(1.2)',
            'hue-rotate(180deg) brightness(1.4)',
            'hue-rotate(270deg) brightness(1.2)',
            'hue-rotate(360deg) brightness(1)',
          ],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2.5,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
        className="relative"
      >
        <img
          src="/imgs/logo.png"
          alt="Zahra's Page Logo"
          className="h-20 w-auto object-contain"
        />
      </motion.div>
      <span className="text-amber-500/90 font-mono text-xs uppercase tracking-widest animate-pulse">
        Loading...
      </span>
    </div>
  );
}
