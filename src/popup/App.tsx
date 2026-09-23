import React, { useEffect, useRef, useState } from 'react';
import { useAppData } from '../utils/useAppData';
import { formatTime, getPhaseProgress, getRemainingMs } from '../utils/formatTime';
import { KnightLogo } from '../components/KnightLogo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const send = (type: string) => chrome.runtime.sendMessage({ type });

const openDashboard = (tab: 'stats' | 'settings') => {
  chrome.tabs.create({ url: `options.html?tab=${tab}` });
};

const fmtMins = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

// ─── SVG progress ring ────────────────────────────────────────────────────────

const Ring: React.FC<{
  progress: number;
  color: string;
  glow: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}> = ({ progress, color, glow, size = 220, strokeWidth = 6, children }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="url(#ringGrad)" strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 8px ${glow})`,
          }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
};

// ─── Session dots ─────────────────────────────────────────────────────────────

const SessionDots: React.FC<{ cycle: number; total: number }> = ({ cycle, total }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i < cycle ? 10 : 7,
          height: i < cycle ? 10 : 7,
          borderRadius: '50%',
          background: i < cycle ? '#d4af37' : 'rgba(255,255,255,0.12)',
          boxShadow: i < cycle ? '0 0 8px #d4af3780' : 'none',
          transition: 'all 0.4s ease',
        }}
      />
    ))}
  </div>
);

// ─── Icon buttons ─────────────────────────────────────────────────────────────

const IconBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  variant?: 'ghost' | 'accent';
}> = ({ onClick, disabled, title, children, variant = 'ghost' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: 40,
      height: 40,
      borderRadius: 12,
      border: variant === 'accent' ? 'none' : '1px solid rgba(255,255,255,0.12)',
      background: variant === 'accent'
        ? 'linear-gradient(135deg, #d4af37, #b8860b)'
        : 'rgba(255,255,255,0.06)',
      color: disabled ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      transition: 'all 0.15s ease',
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);

// ─── Blocklist strip (view-only, collapsed) ───────────────────────────────────

const BlocklistStrip: React.FC<{ domains: string[]; greyed?: boolean }> = ({ domains, greyed }) => {
  if (domains.length === 0) return null;
  return (
    <div style={{
      padding: '8px 16px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 10, color: greyed ? 'rgba(100,116,139,0.6)' : 'rgba(100,116,139,0.9)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
        Blocked
      </span>
      {domains.slice(0, 5).map((d) => (
        <span key={d} style={{
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 4,
          background: greyed ? 'rgba(255,255,255,0.03)' : 'rgba(248,113,113,0.12)',
          color: greyed ? '#475569' : '#fca5a5',
          border: `1px solid ${greyed ? 'rgba(255,255,255,0.05)' : 'rgba(248,113,113,0.2)'}`,
        }}>
          {d}
        </span>
      ))}
      {domains.length > 5 && (
        <span style={{ fontSize: 10, color: '#475569' }}>+{domains.length - 5}</span>
      )}
    </div>
  );
};

// ─── Idle view ────────────────────────────────────────────────────────────────

const IdleView: React.FC<{ focusedMs: number; unfocusedMs: number }> = ({
  focusedMs, unfocusedMs,
}) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 32px' }}>
    <button
      id="start-focus-btn"
      onClick={() => send('START_FOCUS')}
      style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
        border: 'none',
        color: '#fff',
        fontSize: 36,
        cursor: 'pointer',
        boxShadow: '0 0 40px rgba(212,175,55,0.35), 0 8px 24px rgba(0,0,0,0.4)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.06)'; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
      title="Start Focus Session"
    >
      ▶
    </button>
    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: 500, margin: 0 }}>Start Focus</p>
    {(focusedMs > 0 || unfocusedMs > 0) && (
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: 11, margin: 0, letterSpacing: 0.3 }}>
          <span style={{ color: '#d4af37', fontWeight: 600 }}>{fmtMins(focusedMs)}</span>
          {' focused · '}
          <span style={{ color: '#94a3b8' }}>{fmtMins(unfocusedMs)}</span>
          {' browsing today'}

        </p>
      </div>
    )}
  </div>
);

// ─── Focus view ───────────────────────────────────────────────────────────────

const FocusView: React.FC<{
  remainingMs: number;
  progress: number;
  cycle: number;
  total: number;
  isPaused: boolean;
  isStrict: boolean;
  blocklist: string[];
}> = ({ remainingMs, progress, cycle, total, isPaused, isStrict, blocklist }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {/* Timer fills ~70% of vertical space */}
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 28, paddingBottom: 16 }}>
      <Ring progress={progress} color="#f87171" glow="rgba(248,113,113,0.5)">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>
            {isPaused ? 'Paused' : 'Focus'}
          </div>
          <div style={{ fontSize: 42, fontWeight: 200, color: '#f1f5f9', letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(remainingMs)}
          </div>
        </div>
      </Ring>
    </div>

    <SessionDots cycle={cycle} total={total} />

    <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
      {isPaused ? (
        <IconBtn onClick={() => send('RESUME')} title="Resume" variant="accent">▶</IconBtn>
      ) : (
        <IconBtn onClick={() => send('PAUSE')} disabled={isStrict} title={isStrict ? 'Pause locked in strict mode' : 'Pause'}>⏸</IconBtn>
      )}
      <IconBtn onClick={() => send('STOP')} title="Stop session">■</IconBtn>
      {!isStrict && (
        <IconBtn onClick={() => send('SKIP')} title="Skip to break">⏭</IconBtn>
      )}
    </div>

    <div style={{ flex: 1 }} />
    <BlocklistStrip domains={blocklist} greyed={false} />
  </div>
);

// ─── Break view ───────────────────────────────────────────────────────────────

const BreakView: React.FC<{
  remainingMs: number;
  progress: number;
  isLong: boolean;
  isWaiting: boolean;
  blocklist: string[];
}> = ({ remainingMs, progress, isLong, isWaiting, blocklist }) => {
  const color = isLong ? '#60a5fa' : '#4ade80';
  const glow = isLong ? 'rgba(96,165,250,0.5)' : 'rgba(74,222,128,0.5)';
  const label = isLong ? 'Long Break' : 'Short Break';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 28, paddingBottom: 16 }}>
        <Ring progress={isWaiting ? 0 : progress} color={color} glow={glow}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 8, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>
              {isWaiting ? 'Break Ready' : label}
            </div>
            <div style={{ fontSize: 42, fontWeight: 200, color: '#f1f5f9', letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(remainingMs)}
            </div>
          </div>
        </Ring>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {isWaiting && (
          <button
            onClick={() => send('START_BREAK')}
            style={{
              padding: '8px 20px',
              borderRadius: 12,
              background: `linear-gradient(135deg, ${color}99, ${color})`,
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start Break
          </button>
        )}
        <IconBtn onClick={() => send('SKIP')} title="Skip break">⏭</IconBtn>
      </div>

      <div style={{ flex: 1 }} />
      <BlocklistStrip domains={blocklist} greyed={true} />
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const Header: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <KnightLogo size={16} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.3 }}>
        Knight Pomodoro
      </span>
    </div>
    <div style={{ display: 'flex', gap: 2 }}>
      <button
        onClick={() => openDashboard('stats')}
        title="Stats"
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 13 }}
        onMouseEnter={e => ((e.target as HTMLElement).style.color = '#f1f5f9')}
        onMouseLeave={e => ((e.target as HTMLElement).style.color = '#64748b')}
      >
        📊
      </button>
      <button
        onClick={() => openDashboard('settings')}
        title="Settings"
        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 13 }}
        onMouseEnter={e => ((e.target as HTMLElement).style.color = '#f1f5f9')}
        onMouseLeave={e => ((e.target as HTMLElement).style.color = '#64748b')}
      >
        ⚙️
      </button>
    </div>
  </div>
);

// ─── Root app: state router ───────────────────────────────────────────────────

const BG: Record<string, string> = {
  idle: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
  focus: 'linear-gradient(160deg, #1c0a0a 0%, #0f172a 100%)',
  shortBreak: 'linear-gradient(160deg, #071a0e 0%, #0f172a 100%)',
  longBreak: 'linear-gradient(160deg, #0a1628 0%, #0f172a 100%)',
};

const App: React.FC = () => {
  const data = useAppData();
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const [displayMs, setDisplayMs] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tick = () => {
      const d = dataRef.current;
      if (!d) return;
      setDisplayMs(getRemainingMs(d.timerState));
      setProgress(getPhaseProgress(d.timerState));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div style={{
        width: 340,
        height: 460,
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#475569',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
      }}>
        Loading…
      </div>
    );
  }

  const { timerState, settings, dailyStats } = data;
  const phase = timerState.currentState;
  const isPaused = timerState.pausedAt !== null;
  const isBreakWaiting = (phase === 'shortBreak' || phase === 'longBreak') && isPaused;

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const todayStats = dailyStats[today] ?? { focusedTime: 0, unfocusedTime: 0, completedSessions: 0 };

  return (
    <div
      id="kp-popup-root"
      style={{
        width: 340,
        height: 460,
        background: BG[phase] ?? BG.idle,
        display: 'flex',
        flexDirection: 'column',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        overflow: 'hidden',
        transition: 'background 0.6s ease',
      }}
    >
      <Header />

      {phase === 'idle' && (
        <IdleView
          focusedMs={todayStats.focusedTime}
          unfocusedMs={todayStats.unfocusedTime}
        />
      )}

      {phase === 'focus' && (
        <FocusView
          remainingMs={displayMs}
          progress={progress}
          cycle={timerState.currentCycle}
          total={settings.longBreakInterval}
          isPaused={isPaused}
          isStrict={settings.strictMode}
          blocklist={settings.blocklist}
        />
      )}

      {(phase === 'shortBreak' || phase === 'longBreak') && (
        <BreakView
          remainingMs={displayMs}
          progress={progress}
          isLong={phase === 'longBreak'}
          isWaiting={isBreakWaiting}
          blocklist={settings.blocklist}
        />
      )}
    </div>
  );
};

export default App;