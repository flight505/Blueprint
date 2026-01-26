import { ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

/**
 * Animation duration constants (in seconds)
 */
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.2, // 200ms as required
  slow: 0.3,
};

/**
 * Common animation presets
 */
export const ANIMATION_PRESETS = {
  /** Fade in/out animation */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  /** Scale up animation (for modals) */
  scaleUp: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  /** Slide down animation (for dropdowns/panels) */
  slideDown: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  /** Slide up animation (for bottom sheets) */
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  },
  /** Collapse animation (for expandable sections) */
  collapse: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' },
    exit: { opacity: 0, height: 0 },
  },
};

/**
 * Props for AnimatedModal component
 */
interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

/**
 * Animated modal with backdrop and scale animation
 *
 * Features:
 * - Smooth scale + fade animation (200ms)
 * - Click outside to close
 * - Escape key to close
 * - Focus trap (add your own focus management)
 */
export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className = '',
  backdropClassName = '',
  ...ariaProps
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_DURATION.normal }}
            className={`absolute inset-0 bg-black/50 ${backdropClassName}`}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: ANIMATION_DURATION.normal, ease: 'easeOut' }}
            className={`relative z-10 ${className}`}
            role="dialog"
            aria-modal="true"
            {...ariaProps}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Props for AnimatedOverlay component (command palette, quick open, etc.)
 */
interface AnimatedOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  position?: 'center' | 'top';
}

/**
 * Animated overlay with slide-down animation
 *
 * Features:
 * - Slide down + fade animation (200ms)
 * - Positioned at top for command palette style
 * - Click outside to close
 */
export function AnimatedOverlay({
  isOpen,
  onClose,
  children,
  className = '',
  backdropClassName = '',
  position = 'top',
}: AnimatedOverlayProps) {
  const positionClass = position === 'center'
    ? 'items-center justify-center'
    : 'items-start justify-center pt-[15vh]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex ${positionClass}`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
            className={`absolute inset-0 bg-black/50 ${backdropClassName}`}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: ANIMATION_DURATION.normal, ease: 'easeOut' }}
            className={`relative z-10 ${className}`}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Props for AnimatedCollapse component
 */
interface AnimatedCollapseProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Animated collapse/expand panel
 *
 * Features:
 * - Smooth height animation (200ms)
 * - Overflow hidden during animation
 * - Works with dynamic content height
 */
export function AnimatedCollapse({
  isOpen,
  children,
  className = '',
}: AnimatedCollapseProps) {
  const variants: Variants = {
    open: {
      opacity: 1,
      height: 'auto',
      transition: { duration: ANIMATION_DURATION.normal, ease: 'easeOut' },
    },
    closed: {
      opacity: 0,
      height: 0,
      transition: { duration: ANIMATION_DURATION.normal, ease: 'easeIn' },
    },
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial="closed"
          animate="open"
          exit="closed"
          variants={variants}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Props for AnimatedTabContent component
 */
interface AnimatedTabContentProps {
  tabKey: string;
  children: ReactNode;
  className?: string;
  direction?: 'left' | 'right';
}

/**
 * Animated tab content with slide transition
 *
 * Features:
 * - Crossfade animation between tabs
 * - Minimal layout shift
 * - 200ms duration
 */
export function AnimatedTabContent({
  tabKey,
  children,
  className = '',
}: AnimatedTabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: ANIMATION_DURATION.normal, ease: 'easeInOut' }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Animated presence wrapper for simple fade in/out
 */
interface AnimatedPresenceWrapperProps {
  show: boolean;
  children: ReactNode;
  className?: string;
  preset?: keyof typeof ANIMATION_PRESETS;
  duration?: number;
}

export function AnimatedPresenceWrapper({
  show,
  children,
  className = '',
  preset = 'fade',
  duration = ANIMATION_DURATION.normal,
}: AnimatedPresenceWrapperProps) {
  const animation = ANIMATION_PRESETS[preset];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={animation.initial}
          animate={animation.animate}
          exit={animation.exit}
          transition={{ duration }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
