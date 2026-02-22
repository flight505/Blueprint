import { useCallback, useRef, useState } from 'react';

interface ResizeHandleProps {
  currentWidth: number;
  onWidthChange: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export function ResizeHandle({
  currentWidth,
  onWidthChange,
  minWidth = 220,
  maxWidth = 600,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, width: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startRef.current = { x: e.clientX, width: currentWidth };

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startRef.current.x;
        const clamped = Math.min(maxWidth, Math.max(minWidth, startRef.current.width + delta));
        onWidthChange(clamped);
      };

      const onMouseUp = () => {
        setDragging(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [currentWidth, minWidth, maxWidth, onWidthChange]
  );

  const handleDoubleClick = useCallback(() => {
    const defaultWidth = minWidth + (maxWidth - minWidth) * 0.4;
    onWidthChange(defaultWidth);
  }, [minWidth, maxWidth, onWidthChange]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize, double-click to reset"
      className="relative flex-shrink-0 cursor-col-resize"
      style={{ width: 1 }}
    >
      {/* Wide invisible hit area */}
      <div className="absolute inset-y-0 -left-[5px] w-[11px] z-10" />
      {/* Visible line */}
      <div
        className={`absolute inset-y-0 -left-[0.5px] w-[1px] transition-all duration-100 ${
          dragging
            ? 'bg-purple-400/60 shadow-[0_0_6px_rgba(167,139,250,0.4)]'
            : 'bg-border-default hover:bg-purple-400/40'
        }`}
      />
    </div>
  );
}
