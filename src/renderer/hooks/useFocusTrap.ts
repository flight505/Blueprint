/**
 * useFocusTrap - Traps focus within a container for modal dialogs
 *
 * Implements WCAG 2.2 focus management requirements:
 * - Traps focus within modal when open
 * - Restores focus to trigger element on close
 * - Handles Tab/Shift+Tab cycling
 * - Auto-focuses first focusable element on open
 */
import { useRef, useEffect, useCallback } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  isActive: boolean;
  /** Whether to auto-focus the first element */
  autoFocus?: boolean;
  /** Whether to restore focus on deactivation */
  restoreFocus?: boolean;
  /** Selector for the initial focus target (defaults to first focusable) */
  initialFocusSelector?: string;
}

interface UseFocusTrapReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Handler for keydown events (for Tab trapping) */
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useFocusTrap({
  isActive,
  autoFocus = true,
  restoreFocus = true,
  initialFocusSelector,
}: UseFocusTrapOptions): UseFocusTrapReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(el => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !isActive) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (e.shiftKey) {
      // Shift+Tab: if on first element, go to last
      if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, go to first
      if (activeElement === lastElement || !containerRef.current?.contains(activeElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, getFocusableElements]);

  // Save previously focused element and set initial focus
  useEffect(() => {
    if (isActive) {
      // Save the currently focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      if (autoFocus && containerRef.current) {
        // Wait for content to render
        requestAnimationFrame(() => {
          if (!containerRef.current) return;

          let targetElement: HTMLElement | null = null;

          // Try to focus the specified initial element
          if (initialFocusSelector) {
            targetElement = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
          }

          // Fall back to first focusable element
          if (!targetElement) {
            const focusableElements = getFocusableElements();
            targetElement = focusableElements[0] || null;
          }

          targetElement?.focus();
        });
      }
    }

    return () => {
      // Restore focus on cleanup (when isActive becomes false)
      if (restoreFocus && previousActiveElementRef.current && !isActive) {
        // Use setTimeout to ensure focus is restored after any animations
        setTimeout(() => {
          previousActiveElementRef.current?.focus();
          previousActiveElementRef.current = null;
        }, 0);
      }
    };
  }, [isActive, autoFocus, restoreFocus, initialFocusSelector, getFocusableElements]);

  // Handle restoring focus when trap deactivates
  useEffect(() => {
    if (!isActive && restoreFocus && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isActive, restoreFocus]);

  return {
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    handleKeyDown,
  };
}

export default useFocusTrap;
