import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppData } from '../utils/useAppData';
import { formatTime, getActualRemainingTime } from '../utils/formatTime';

import tailwindStyles from '../index.css?inline';

const FloatingTimer: React.FC = () => {
  const data = useAppData();

  // Always-current ref so the interval never reads stale data
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const [displayTime, setDisplayTime] = useState<number>(0);
  const [position, setPosition] = useState({ x: window.innerWidth - 160, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Visibility is pure derived logic — no extra state required.
  // Hide when IDLE or when a break is waiting for the user to start.
  const isBreakWaiting = data
    ? (data.timerState.phase === 'SHORT_BREAK' || data.timerState.phase === 'LONG_BREAK') &&
      !!data.timerState.pausedTime
    : false;
  const isVisible = !!data && data.timerState.phase !== 'IDLE' && !isBreakWaiting;

  // Countdown ticker — always runs; CSS opacity hides it when irrelevant
  useEffect(() => {
    if (data) setDisplayTime(getActualRemainingTime(data.timerState));
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      // Use the ref so the callback always reads the latest data,
      // even if the effect hasn't re-run yet due to batching.
      if (dataRef.current) setDisplayTime(getActualRemainingTime(dataRef.current.timerState));
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data]);

  // Drag handling
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const safeX = Math.max(0, Math.min(position.x, window.innerWidth - 140));
  const safeY = Math.max(0, Math.min(position.y, window.innerHeight - 140));

  // Phase colours — fall back to FOCUS defaults when data is null (widget is invisible anyway)
  const phase = data?.timerState.phase ?? 'FOCUS';
  let phaseLabel = '';
  let ringColor = '#ef4444';
  let bgGradient = 'from-red-950/80 to-slate-900';

  switch (phase) {
    case 'FOCUS':
      phaseLabel = 'Focus';
      ringColor = '#ef4444';
      bgGradient = 'from-red-950/80 to-slate-900';
      break;
    case 'SHORT_BREAK':
      phaseLabel = 'Break';
      ringColor = '#22c55e';
      bgGradient = 'from-green-950/80 to-slate-900';
      break;
    case 'LONG_BREAK':
      phaseLabel = 'Long Break';
      ringColor = '#3b82f6';
      bgGradient = 'from-blue-950/80 to-slate-900';
      break;
  }

  const initialDuration = data?.timerState.initialDuration ?? 0;
  const progress = initialDuration > 0 ? (initialDuration - displayTime) / initialDuration : 0;

  return (
    <div
      style={{
        position: 'fixed',
        left: `${safeX}px`,
        top: `${safeY}px`,
        zIndex: 2147483647,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      className={`flex flex-col w-[130px] h-[130px] items-center justify-center bg-gradient-to-br ${bgGradient} text-white select-none rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl group overflow-hidden`}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing bg-white/0 hover:bg-white/10 transition-colors z-10"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>

      {/* Progress ring background */}
      <div className="absolute inset-4 rounded-full border-2 border-white/10"></div>

      {/* Progress ring */}
      <svg
        className="absolute inset-4 -rotate-90"
        style={{ width: 'calc(100% - 32px)', height: 'calc(100% - 32px)' }}
      >
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          stroke={ringColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${progress * 283} 283`}
          style={{ filter: `drop-shadow(0 0 6px ${ringColor}40)` }}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-extralight tabular-nums tracking-tight text-white drop-shadow-lg mb-1">
          {formatTime(displayTime)}
        </div>
        <div
          className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-60"
          style={{ color: ringColor }}
        >
          {phaseLabel}
        </div>
      </div>
    </div>
  );
};

// Initialize shadow DOM and inject React container with error handling
const init = () => {
  try {
    // Remove any existing container to avoid duplicates
    const existingContainer = document.getElementById('knight-pomodoro-floating-timer-root');
    if (existingContainer) {
      existingContainer.remove();
    }

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
  } catch (error) {
    console.error('Failed to initialize Knight Pomodoro floating timer:', error);

    // Fallback: create a simple timer without shadow DOM if needed
    const fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'knight-pomodoro-floating-timer-fallback';
    fallbackContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 120px;
      height: 120px;
      background: linear-gradient(to bottom, #1e293b, #0f172a);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: system-ui, sans-serif;
      z-index: 2147483647;
      pointer-events: none;
    `;

    fallbackContainer.innerHTML = `
      <div style="font-size: 28px; font-weight: 300; letter-spacing: -0.5px;">00:00</div>
      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">Ready</div>
    `;

    document.body.appendChild(fallbackContainer);
  }
};

// Check if already injected, but also handle potential reloads
const initializeTimer = () => {
  if (!document.getElementById('knight-pomodoro-floating-timer-root')) {
    init();
  }
};

// Initialize on load
initializeTimer();

// Also initialize if the document is still loading (belt-and-suspenders)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTimer);
}

// Re-initialize if the container is removed (e.g., by page navigation)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && !document.getElementById('knight-pomodoro-floating-timer-root')) {
      initializeTimer();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
