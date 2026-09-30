import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppData } from '../utils/useAppData';
import { formatTime, getPhaseProgress, getRemainingMs } from '../utils/formatTime';
import { getFloatingTimerUI, updateFloatingTimerUI } from '../storage/storage';

// ─── Phase colour palette ─────────────────────────────────────────────────────

const PHASE_COLORS = {
  idle:       { ring: '#aaa49a', bg: 'rgba(38,39,35,0.96)',   pill: '#282923' },
  focus:      { ring: '#d57462', bg: 'rgba(69,43,39,0.96)', pill: '#4a2d28' },
  shortBreak: { ring: '#87a78c', bg: 'rgba(40,58,45,0.96)',   pill: '#2d4936' },
  longBreak:  { ring: '#9ca9bb', bg: 'rgba(47,54,65,0.96)', pill: '#343d4b' },
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
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
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
  const PILL_W = 218;
  const PILL_H = 48;
  const CARD_W = 228;
  const CARD_H = 248;

  // Restore position/collapsed from storage directly — independent of the
  // useAppData hook so we don't have to wait for the full AppData merge.
  useEffect(() => {
    const defaultX = Math.max(16, window.innerWidth - PILL_W - 16);
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
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const el = containerRef.current;
      const w = el?.offsetWidth ?? PILL_W;
      const h = el?.offsetHeight ?? PILL_H;
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
      const waitingForBreak = phase === 'shortBreak' || phase === 'longBreak';
      chrome.runtime.sendMessage({ type: waitingForBreak ? 'START_BREAK' : 'RESUME' });
    } else {
      chrome.runtime.sendMessage({ type: 'PAUSE' });
    }
  };

  const sendAction = (type: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type });
  };

  const phaseLabel: Record<string, string> = {
    idle:       '',
    focus:      'Focus',
    shortBreak: 'Break',
    longBreak:  'Long Break',
  };

  const isPaused = data?.timerState.pausedAt !== null;
  const isWaitingForBreak = (phase === 'shortBreak' || phase === 'longBreak') && isPaused;
  const isStrictFocus = phase === 'focus' && Boolean(data?.settings.strictMode);

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
        /* Compact timer: show the phase and one-tap pause/resume. */
        <div
          onMouseDown={onMouseDown}
          role="group"
          aria-label={`${phaseLabel[phase]} timer, ${formatTime(displayMs)} remaining`}
          style={{
            width: PILL_W,
            height: PILL_H,
            background: colors.pill,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 0 11px',
            gap: 7,
            cursor: 'grab',
            boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
            animation: isPulsing ? 'kp-pulse 0.6s ease' : undefined,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isPaused ? '#94a3b8' : colors.ring,
              boxShadow: 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ minWidth: 0, flex: 1, color: '#f3f2ed', fontSize: 11, fontWeight: 550, whiteSpace: 'nowrap' }}>
            {isPaused ? (isWaitingForBreak ? 'Break ready' : 'Paused') : phaseLabel[phase]}
          </span>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 650, letterSpacing: 0.15, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(displayMs)}
          </span>
          <button
            type="button"
            onClick={handlePauseResume}
            disabled={isStrictFocus}
            aria-label={isPaused ? (isWaitingForBreak ? 'Start break' : 'Resume timer') : 'Pause timer'}
            title={isStrictFocus ? 'Pause is disabled in strict mode' : isPaused ? 'Resume timer' : 'Pause timer'}
            style={{
              height: 30, minWidth: 54, padding: '0 8px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.09)',
              color: '#fff', fontSize: 10, fontWeight: 650, cursor: isStrictFocus ? 'not-allowed' : 'pointer',
              opacity: isStrictFocus ? 0.55 : 1,
            }}
          >
            {isPaused ? (isWaitingForBreak ? 'Start' : 'Resume') : isStrictFocus ? 'Locked' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleCollapsed(); }}
            aria-label="Expand timer"
            title="Expand timer"
            style={{ width: 21, height: 28, padding: 0, border: 0, background: 'transparent', color: '#d6d4cd', fontSize: 16, cursor: 'pointer' }}
          >
            ⌃
          </button>
        </div>
      ) : (
        /* Expanded timer card */
        <div
          style={{
            position: 'relative',
            width: CARD_W,
            height: CARD_H,
            background: colors.bg,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 26px rgba(0,0,0,0.24)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 5,
            padding: '11px 13px 12px',
            animation: isPulsing ? 'kp-pulse 0.6s ease' : undefined,
          }}
        >
          <div
            onMouseDown={onMouseDown}
            style={{
              width: '100%',
              height: 27,
              flexShrink: 0,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isPaused ? '#a7a398' : colors.ring }} />
              <span style={{ color: '#f1f0eb', fontSize: 12, fontWeight: 650 }}>{phaseLabel[phase]}</span>
              {isPaused && <span style={{ color: '#b9b6ac', fontSize: 9, fontWeight: 600 }}>PAUSED</span>}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleCollapsed(); }}
              aria-label="Collapse timer"
              title="Collapse timer"
              style={{ width: 27, height: 27, padding: 0, border: 0, borderRadius: 7, background: 'rgba(255,255,255,0.07)', color: '#eee', fontSize: 16, cursor: 'pointer' }}
            >
              ⌄
            </button>
          </div>

          <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
            <ProgressRing progress={progress} color={colors.ring} size={112} strokeWidth={5} />
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
                  fontSize: 24,
                  fontWeight: 500,
                  letterSpacing: -0.8,
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
                }}
              >
                {isWaitingForBreak ? 'READY' : isPaused ? 'PAUSED' : 'REMAINING'}
              </span>
            </div>
          </div>

          {phase === 'focus' && data && (
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, lineHeight: '12px' }}>
              {Math.min(data.timerState.currentCycle + 1, data.settings.longBreakInterval)} of {data.settings.longBreakInterval} sessions before long break
            </span>
          )}

          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 7, marginTop: 'auto' }}>
            <button
              onClick={handlePauseResume}
              disabled={isStrictFocus}
              aria-label={isPaused ? (isWaitingForBreak ? 'Start break' : 'Resume timer') : 'Pause timer'}
              style={{
                minWidth: 94, height: 34, padding: '0 11px', borderRadius: 9,
                background: colors.ring, border: `1px solid ${colors.ring}`,
                color: '#171815', fontSize: 11, fontWeight: 700,
                cursor: isStrictFocus ? 'not-allowed' : 'pointer', opacity: isStrictFocus ? 0.55 : 1,
              }}
            >
              {isPaused ? (isWaitingForBreak ? 'Start break' : 'Resume') : isStrictFocus ? 'Focus locked' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={sendAction(phase === 'focus' ? 'STOP' : 'SKIP')}
              aria-label={phase === 'focus' ? 'End focus session' : 'Skip break'}
              title={phase === 'focus' ? 'End focus session' : 'Skip break'}
              style={{ height: 34, padding: '0 11px', borderRadius: 9, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#eee', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              {phase === 'focus' ? 'End' : 'Skip'}
            </button>
          </div>
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
