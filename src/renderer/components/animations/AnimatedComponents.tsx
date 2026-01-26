import { ReactNode, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

/**
 * Focus trap hook for modal dialogs - WCAG 2.2 compliant
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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
  /** Auto-focus first focusable element on open */
  autoFocus?: boolean;
  /** Restore focus to trigger element on close */
  restoreFocus?: boolean;
  /** Custom selector for initial focus target */
  initialFocusSelector?: string;
}

/**
 * Animated modal with backdrop and scale animation
 *
 * Features:
 * - Smooth scale + fade animation (200ms)
 * - Click outside to close
 * - Escape key to close
 * - Focus trap and focus restoration (WCAG 2.2)
 */
export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className = '',
  backdropClassName = '',
  autoFocus = true,
  restoreFocus = true,
  initialFocusSelector,
  ...ariaProps
}: AnimatedModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    // Tab trapping
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (e.shiftKey) {
      if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (activeElement === lastElement || !containerRef.current?.contains(activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [onClose, getFocusableElements]);

  // Focus management on open/close
  useEffect(() => {
    if (isOpen) {
      // Save the currently focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      if (autoFocus && containerRef.current) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;

          let targetElement: HTMLElement | null = null;

          if (initialFocusSelector) {
            targetElement = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
          }

          if (!targetElement) {
            const focusableElements = getFocusableElements();
            targetElement = focusableElements[0] || null;
          }

          targetElement?.focus();
        });
      }
    }
  }, [isOpen, autoFocus, initialFocusSelector, getFocusableElements]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && restoreFocus && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen, restoreFocus]);

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
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: ANIMATION_DURATION.normal, ease: 'easeOut' }}
            className={`relative z-10 ${className}`}
            role="dialog"
            aria-modal="true"
            onKeyDown={handleKeyDown}
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
  /** Auto-focus first focusable element on open */
  autoFocus?: boolean;
  /** Restore focus to trigger element on close */
  restoreFocus?: boolean;
  /** Custom selector for initial focus target */
  initialFocusSelector?: string;
}

/**
 * Animated overlay with slide-down animation
 *
 * Features:
 * - Slide down + fade animation (200ms)
 * - Positioned at top for command palette style
 * - Click outside to close
 * - Focus trap and focus restoration (WCAG 2.2)
 */
export function AnimatedOverlay({
  isOpen,
  onClose,
  children,
  className = '',
  backdropClassName = '',
  position = 'top',
  autoFocus = true,
  restoreFocus = true,
  initialFocusSelector,
}: AnimatedOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const positionClass = position === 'center'
    ? 'items-center justify-center'
    : 'items-start justify-center pt-[15vh]';

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (e.shiftKey) {
      if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (activeElement === lastElement || !containerRef.current?.contains(activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [onClose, getFocusableElements]);

  // Focus management on open
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      if (autoFocus && containerRef.current) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;

          let targetElement: HTMLElement | null = null;

          if (initialFocusSelector) {
            targetElement = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
          }

          if (!targetElement) {
            const focusableElements = getFocusableElements();
            targetElement = focusableElements[0] || null;
          }

          targetElement?.focus();
        });
      }
    }
  }, [isOpen, autoFocus, initialFocusSelector, getFocusableElements]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && restoreFocus && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen, restoreFocus]);

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
            ref={containerRef}
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: ANIMATION_DURATION.normal, ease: 'easeOut' }}
            className={`relative z-10 ${className}`}
            role="dialog"
            aria-modal="true"
            onKeyDown={handleKeyDown}
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
