import { useCallback, useRef } from 'react';

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
  const isDragging = useRef(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const startX = e.clientX;
      const startWidth = currentWidth;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
        onWidthChange(newWidth);
      };

      const onMouseUp = () => {
        isDragging.current = false;
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

  return (
    <div
      ref={handleRef}
      onMouseDown={handleMouseDown}
      className="w-[4px] flex-shrink-0 cursor-col-resize group relative hover:w-[4px]"
    >
      <div className="absolute inset-y-0 -left-[2px] w-[8px] z-10" />
      <div className="h-full w-full bg-transparent group-hover:bg-purple-400/30 transition-colors duration-150" />
    </div>
  );
}
