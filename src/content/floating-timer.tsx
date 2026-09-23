import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppData } from '../utils/useAppData';
import { formatTime, getPhaseProgress, getRemainingMs } from '../utils/formatTime';
import { getFloatingTimerUI, updateFloatingTimerUI } from '../storage/storage';

// ─── Phase colour palette ─────────────────────────────────────────────────────

const PHASE_COLORS = {
  idle:       { ring: '#64748b', bg: 'rgba(15,23,42,0.92)',   pill: '#334155' },
  focus:      { ring: '#f87171', bg: 'rgba(127,29,29,0.88)', pill: '#991b1b' },
  shortBreak: { ring: '#4ade80', bg: 'rgba(20,83,45,0.88)',   pill: '#166534' },
  longBreak:  { ring: '#60a5fa', bg: 'rgba(30,58,138,0.88)', pill: '#1e3a8a' },
};

// ─── Keyframe styles injected into shadow root ─────────────────────────────────
// We do NOT use `import '...css?inline'` here because CRXJS may not correctly
// bundle ?inline CSS imports inside content script entry points, causing a
// silent module evaluation failure.  All pill styles use inline React style
// objects; we only need the keyframe + a box-sizing reset in the shadow DOM.

const SHADOW_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes kp-pulse {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
`;

// ─── Progress ring (SVG) ──────────────────────────────────────────────────────

const ProgressRing: React.FC<{ progress: number; color: string; size: number; strokeWidth: number }> = ({
  progress, color, size, strokeWidth,
}) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 5px ${color}80)` }}
      />
    </svg>
  );
};

// ─── The floating timer component ─────────────────────────────────────────────

const FloatingTimer: React.FC = () => {
  // Debug: confirm the component actually mounted in the shadow root (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) console.log('[KP] FloatingTimer mounted');
  }, []);

  const data = useAppData();
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const [displayMs, setDisplayMs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevState = useRef<string | null>(null);

  // ── Position & collapsed state ─────────────────────────────────────────────
  // We set posReady=true immediately after the first chrome.storage read (even
  // if storage is empty) so the pill is never blocked from rendering by an
  // async data dependency.  The old pattern of gating posReady on `!!data`
  // caused a silent deadlock: data=null → posReady=false → opacity=0.
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [collapsed, setCollapsed] = useState(true);
  const [posReady, setPosReady] = useState(false);

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore position/collapsed from storage directly — independent of the
  // useAppData hook so we don't have to wait for the full AppData merge.
  useEffect(() => {
    const defaultX = window.innerWidth - 104; // right-edge minus pill width + margin
    const defaultY = 24;

    getFloatingTimerUI().then((ui) => {
      setPos({
        x: ui.x >= 0 ? ui.x : defaultX,
        y: ui.y >= 0 ? ui.y : defaultY,
      });
      setCollapsed(ui.collapsed);
      setPosReady(true); // position is known — safe to render
    });
  }, []); // run once on mount

  // Countdown ticker
  useEffect(() => {
    const tick = () => {
      const d = dataRef.current;
      if (!d) return;
      setDisplayMs(getRemainingMs(d.timerState));
      setProgress(getPhaseProgress(d.timerState));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  // Pulse on state transition
  useEffect(() => {
    if (!data) return;
    const state = data.timerState.currentState;
    if (prevState.current !== null && prevState.current !== state) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 600);
    }
    prevState.current = state;
  }, [data]);

  const phase = (data?.timerState.currentState ?? 'idle') as keyof typeof PHASE_COLORS;
  const colors = PHASE_COLORS[phase] ?? PHASE_COLORS.idle;

  // ── Visibility ─────────────────────────────────────────────────────────────
  // Design decision: hide the pill when timer is idle (nothing useful to show).
  // The Shadow host div is ALWAYS in the DOM regardless — only the inner
  // component's visual opacity changes.  `posReady` gates rendering until we
  // know where to place the pill (prevents a flash at 0,0).
  const isVisible = posReady && phase !== 'idle';

  // ── Drag handling ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const el = containerRef.current;
      const w = el?.offsetWidth ?? 88;
      const h = el?.offsetHeight ?? 36;
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.current.x, window.innerWidth - w));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.current.y, window.innerHeight - h));
      setPos({ x: newX, y: newY });
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setPos((p) => {
        updateFloatingTimerUI({ x: p.x, y: p.y });
        return p;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    updateFloatingTimerUI({ collapsed: next });
  };

  // ── Pause/resume via message ───────────────────────────────────────────────
  const handlePauseResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data) return;
    const ts = data.timerState;
    if (ts.pausedAt !== null) {
      chrome.runtime.sendMessage({ type: 'RESUME' });
    } else {
      chrome.runtime.sendMessage({ type: 'PAUSE' });
    }
  };

  const phaseLabel: Record<string, string> = {
    idle:       '',
    focus:      'Focus',
    shortBreak: 'Break',
    longBreak:  'Long Break',
  };

  const isPaused = data?.timerState.pausedAt !== null;

  // ── Dimensions ─────────────────────────────────────────────────────────────
  const PILL_W = 88;
  const PILL_H = 36;
  const CARD_W = 160;
  const CARD_H = 180;

  const safeX = pos.x < 0
    ? window.innerWidth - (collapsed ? PILL_W : CARD_W) - 16
    : Math.max(0, Math.min(pos.x, window.innerWidth  - (collapsed ? PILL_W : CARD_W)));
  const safeY = pos.y < 0
    ? 24
    : Math.max(0, Math.min(pos.y, window.innerHeight - (collapsed ? PILL_H : CARD_H)));

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: safeX,
        top: safeY,
        zIndex: 2147483647,
        // Always in the DOM; toggle visual presence only.
        // `visibility` hides the element during idle without removing it from
        // the stacking context, and avoids the layout flicker of display:none.
        opacity:      isVisible ? 1 : 0,
        visibility:   isVisible ? 'visible' : 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.4s ease, visibility 0.4s ease, width 0.25s ease, height 0.25s ease',
        userSelect: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {collapsed ? (
        /* ── Collapsed pill ── */
        <div
          onMouseDown={onMouseDown}
          onClick={toggleCollapsed}
          style={{
            width: PILL_W,
            height: PILL_H,
            background: colors.pill,
            borderRadius: 18,
            border: `1.5px solid ${colors.ring}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: 'grab',
            boxShadow: `0 4px 16px ${colors.ring}30, 0 2px 8px rgba(0,0,0,0.5)`,
            animation: isPulsing ? 'kp-pulse 0.6s ease' : undefined,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isPaused ? '#94a3b8' : colors.ring,
              boxShadow: isPaused ? 'none' : `0 0 6px ${colors.ring}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: '#f1f5f9',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: -0.3,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(displayMs)}
          </span>
        </div>
      ) : (
        /* ── Expanded card ── */
        <div
          style={{
            position: 'relative', // needed for absolute-positioned children (drag handle, × button)
            width: CARD_W,
            height: CARD_H,
            background: colors.bg,
            borderRadius: 20,
            border: `1.5px solid ${colors.ring}30`,
            backdropFilter: 'blur(16px)',
            boxShadow: `0 8px 32px ${colors.ring}20, 0 4px 16px rgba(0,0,0,0.6)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 16,
            animation: isPulsing ? 'kp-pulse 0.6s ease' : undefined,
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onMouseDown}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 32,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 32, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 4 }} />
          </div>

          {/* Collapse button */}
          <button
            onClick={toggleCollapsed}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: 2,
            }}
            title="Collapse"
          >
            ×
          </button>

          {/* Progress ring + time */}
          <div style={{ position: 'relative', width: 96, height: 96, marginTop: 8 }}>
            <ProgressRing progress={progress} color={colors.ring} size={96} strokeWidth={5} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  color: '#f1f5f9',
                  fontSize: 20,
                  fontWeight: 300,
                  letterSpacing: -0.5,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatTime(displayMs)}
              </span>
              <span
                style={{
                  color: colors.ring,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginTop: 2,
                  opacity: 0.8,
                }}
              >
                {phaseLabel[phase]}
              </span>
            </div>
          </div>

          {/* Pause / Resume */}
          {phase === 'focus' && (
            <button
              onClick={handlePauseResume}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f1f5f9',
                borderRadius: 10,
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                letterSpacing: 0.3,
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Shadow DOM injection ─────────────────────────────────────────────────────

const init = () => {
  try {
    // Guard: never double-inject
    if (document.getElementById('kp-floating-timer-root')) return;

    if (import.meta.env.DEV) console.log('[KP] Injecting floating timer into', document.location.href);

    const host = document.createElement('div');
    host.id = 'kp-floating-timer-root';
    // `all: initial` resets inherited CSS so host-page styles don't bleed in.
    // Explicit `position:fixed` + z-index ensure it floats above everything
    // including pages that set overflow:hidden on their root elements.
    host.style.cssText = [
      'all: initial',
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 0',
      'height: 0',
      'overflow: visible',
      'z-index: 2147483647',
      'pointer-events: none', // the inner React div handles its own pointer-events
    ].join('; ');
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Inject only our minimal reset + keyframes — no Tailwind base styles that
    // would override host-page styles or bloat the shadow root.
    const style = document.createElement('style');
    style.textContent = SHADOW_STYLES;
    shadow.appendChild(style);

    const reactRoot = document.createElement('div');
    shadow.appendChild(reactRoot);
    createRoot(reactRoot).render(<FloatingTimer />);
    if (import.meta.env.DEV) console.log('[KP] Floating timer React root created');
  } catch (e) {
    if (import.meta.env.DEV) console.error('[KP] Floating timer init failed:', e);
  }
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// content_scripts run at document_idle so document.body always exists here,
// but guard defensively anyway.
if (document.body) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

// Re-inject only when the host element is removed (SPA hard-nav, etc.).
// Watch childList on body ONLY — no subtree — to avoid firing on every single
// DOM mutation the host page makes (which was previously causing thousands of
// tryInit() calls per second).
const _kpObserver = new MutationObserver(() => {
  if (!document.getElementById('kp-floating-timer-root')) init();
});

if (document.body) {
  _kpObserver.observe(document.body, { childList: true });
}
