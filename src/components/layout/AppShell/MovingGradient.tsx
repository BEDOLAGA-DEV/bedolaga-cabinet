import { motion } from 'framer-motion';

/**
 * Animated moving gradient background.
 * Uses CSS variables for colors to support theme switching.
 * Lightweight - pure CSS gradients with Framer Motion animation.
 */
export function MovingGradient() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base background */}
      <div className="absolute inset-0 bg-dark-950" />

      {/* Animated gradient layer */}
      <motion.div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(var(--color-accent-500), 0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(var(--color-accent-500), 0.08) 0%, transparent 50%)',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Second animated layer - moves in opposite direction */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 70% 30%, rgba(var(--color-accent-500), 0.1) 0%, transparent 50%), radial-gradient(ellipse 50% 50% at 30% 70%, rgba(var(--color-accent-500), 0.06) 0%, transparent 50%)',
        }}
        animate={{
          backgroundPosition: ['100% 100%', '0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
