import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, CircleX } from '../icons';

/**
 * ConfidenceTooltip - Hover tooltip for confidence indicators
 *
 * Shows confidence score and reasoning when hovering over
 * paragraphs with confidence indicators.
 */

interface TooltipData {
  confidence: number;
  paragraphIndex: number;
  indicators: string[];
  rect: DOMRect;
}

interface ConfidenceTooltipProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color name based on confidence score
 */
function getConfidenceLevel(confidence: number): {
  level: string;
  colorClass: string;
  icon: ReactNode;
} {
  if (confidence >= 0.8) {
    return {
      level: 'High',
      colorClass: 'text-green-600 dark:text-green-400',
      icon: <CircleCheck size={18} />,
    };
  } else if (confidence >= 0.6) {
    return {
      level: 'Medium',
      colorClass: 'text-amber-600 dark:text-amber-400',
      icon: <CircleAlert size={18} />,
    };
  } else {
    return {
      level: 'Low',
      colorClass: 'text-red-600 dark:text-red-400',
      icon: <CircleX size={18} />,
    };
  }
}

export function ConfidenceTooltip({ className = '' }: ConfidenceTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<TooltipData | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Handle hover events from the Tiptap extension
  const handleHover = useCallback((event: CustomEvent<TooltipData>) => {
    const detail = event.detail;
    setData(detail);

    // Position tooltip above the element
    const rect = detail.rect;
    const tooltipWidth = 280;
    const tooltipHeight = 120; // Approximate height

    // Center horizontally, position above
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 8;

    // Keep within viewport bounds
    if (x < 8) x = 8;
    if (x + tooltipWidth > window.innerWidth - 8) {
      x = window.innerWidth - tooltipWidth - 8;
    }
    if (y < 8) {
      // Position below instead
      y = rect.bottom + 8;
    }

    setPosition({ x, y });
    setVisible(true);
  }, []);

  const handleHoverEnd = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    document.addEventListener(
      'tiptap:confidence-hover',
      handleHover as EventListener
    );
    document.addEventListener(
      'tiptap:confidence-hover-end',
      handleHoverEnd as EventListener
    );

    return () => {
      document.removeEventListener(
        'tiptap:confidence-hover',
        handleHover as EventListener
      );
      document.removeEventListener(
        'tiptap:confidence-hover-end',
        handleHoverEnd as EventListener
      );
    };
  }, [handleHover, handleHoverEnd]);

  if (!visible || !data) {
    return null;
  }

  const { level, colorClass, icon } = getConfidenceLevel(data.confidence);
  const percentage = Math.round(data.confidence * 100);

  return (
    <div
      className={`
        fixed z-[100] w-[280px] p-3 rounded-lg shadow-lg
        bg-surface-overlay
        border border-border-default
        text-sm
        ${className}
      `}
      style={{
        left: position.x,
        top: position.y,
      }}
      role="tooltip"
      aria-live="polite"
    >
      {/* Header with score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colorClass} aria-hidden="true">
            {icon}
          </span>
          <span className={`font-semibold ${colorClass}`}>
            {level} Confidence
          </span>
        </div>
        <span
          className={`text-lg font-bold ${colorClass}`}
          aria-label={`${percentage}% confidence score`}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full bg-surface-raised rounded-full mb-3"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all ${
            data.confidence >= 0.8
              ? 'bg-green-500'
              : data.confidence >= 0.6
                ? 'bg-amber-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Indicators/reasons */}
      {data.indicators.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-fg-muted uppercase tracking-wide">
            Reasoning
          </h4>
          <ul className="text-xs text-fg-secondary space-y-0.5">
            {data.indicators.slice(0, 4).map((indicator, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-fg-muted mt-0.5">
                  •
                </span>
                <span>{indicator}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screen reader accessible summary */}
      <span className="sr-only">
        Paragraph {data.paragraphIndex + 1} has {level.toLowerCase()} confidence
        at {percentage}%.
        {data.indicators.length > 0 &&
          ` Reasons: ${data.indicators.join(', ')}.`}
      </span>
    </div>
  );
}

export default ConfidenceTooltip;
