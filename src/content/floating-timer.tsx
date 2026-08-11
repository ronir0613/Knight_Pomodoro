import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppData } from '../utils/useAppData';
import { formatTime, getActualRemainingTime } from '../utils/formatTime';
import { KnightLogo } from '../components/KnightLogo';

// Inject Tailwind styles for the content script
import tailwindStyles from '../index.css?inline';

const FloatingTimer: React.FC = () => {
  const data = useAppData();
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [position, setPosition] = useState({ x: window.innerWidth - 150, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!data) return;
    
    const interval = setInterval(() => {
      setDisplayTime(getActualRemainingTime(data.timerState));
    }, 1000); // Less frequent update for floating timer
    
    setDisplayTime(getActualRemainingTime(data.timerState));

    return () => clearInterval(interval);
  }, [data?.timerState]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!data || data.timerState.phase === 'IDLE') return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleExpand = () => {
    // There isn't a direct API to open the popup programmatically without user action
    // We can open the options page instead, or we could just add controls here later.
  };

  // Ensure it stays within bounds
  const safeX = Math.max(0, Math.min(position.x, window.innerWidth - 100));
  const safeY = Math.max(0, Math.min(position.y, window.innerHeight - 40));

  let bgColor = 'bg-slate-900';
  if (data.timerState.phase === 'SHORT_BREAK') bgColor = 'bg-green-700';
  if (data.timerState.phase === 'LONG_BREAK') bgColor = 'bg-blue-700';

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleExpand}
      style={{
        position: 'fixed',
        left: `${safeX}px`,
        top: `${safeY}px`,
        zIndex: 2147483647,
      }}
      className={`
        ${bgColor} text-white px-3 py-1.5 rounded-full shadow-lg
        flex items-center gap-2 cursor-grab text-sm font-medium tabular-nums
        tracking-wider border border-white/10 backdrop-blur-sm bg-opacity-90
        select-none transition-colors
      `}
    >
      <KnightLogo size={16} variant="monochrome" color="#D4AF37" />
      {formatTime(displayTime)}
    </div>
  );
};

// Initialize shadow DOM and inject React component
const init = () => {
  const container = document.createElement('div');
  container.id = 'knight-pomodoro-floating-timer-root';
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = tailwindStyles;
  shadowRoot.appendChild(style);

  const reactRoot = document.createElement('div');
  shadowRoot.appendChild(reactRoot);

  const root = createRoot(reactRoot);
  root.render(<FloatingTimer />);
};

// Check if already injected
if (!document.getElementById('knight-pomodoro-floating-timer-root')) {
  init();
}
