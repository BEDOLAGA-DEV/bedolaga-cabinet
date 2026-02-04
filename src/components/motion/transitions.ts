import type { Transition, Variants } from 'framer-motion';

// Spring transition for micro-interactions
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

// Smooth spring for larger movements
export const smoothSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

// Expo easing curve (Linear-style)
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

// Fade in animation
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInTransition: Transition = {
  duration: 0.2,
  ease: easeOutExpo,
};

// Slide up animation (for page content, cards)
// Exit is instant to avoid visual glitches in Telegram Mini App
export const slideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0 } },
};

export const slideUpTransition: Transition = {
  duration: 0.2,
  ease: easeOutExpo,
};

// Slide down animation (for dropdowns, popovers)
export const slideDown: Variants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

// Slide from right (for sheets, sidebars)
export const slideRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

// Slide from left
export const slideLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// Scale animation (for modals, dialogs)
export const scale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const scaleTransition: Transition = {
  duration: 0.2,
  ease: easeOutExpo,
};

// Stagger container for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

// Fast stagger for dense lists
export const fastStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

// Stagger item (use with staggerContainer)
// Exit is instant to avoid visual glitches in Telegram Mini App
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0 } },
};

// Backdrop overlay
export const backdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const backdropTransition: Transition = {
  duration: 0.15,
};

// Button press animation values
export const buttonTap = {
  scale: 0.98,
};

export const buttonHover = {
  scale: 1.02,
};

// Sheet/drawer slide up from bottom
export const sheetSlideUp: Variants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

export const sheetTransition: Transition = {
  type: 'spring',
  damping: 30,
  stiffness: 400,
};

// Tooltip animation
export const tooltip: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 2 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 2 },
};

export const tooltipTransition: Transition = {
  duration: 0.15,
  ease: easeOutExpo,
};

// Dropdown menu animation
export const dropdown: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -4 },
};

export const dropdownTransition: Transition = {
  duration: 0.15,
  ease: easeOutExpo,
};

// Command palette animation
export const commandPalette: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

export const commandPaletteTransition: Transition = {
  duration: 0.15,
  ease: easeOutExpo,
};
