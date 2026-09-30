import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, CircleHelp, Coffee, Pause, Play, RotateCcw, Settings2, SkipForward, Square } from 'lucide-react';
import { useAppData } from '../utils/useAppData';
import { formatTime, getPhaseProgress, getRemainingMs } from '../utils/formatTime';
import { KnightLogo } from '../components/KnightLogo';
import './popup.css';

const send = (type: string) => chrome.runtime.sendMessage({ type });
const openDashboard = (tab: 'stats' | 'settings') => chrome.tabs.create({ url: `options.html?tab=${tab}` });
const minutes = (ms: number) => Math.round(ms / 60_000);

const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const ProgressRing: React.FC<{ progress: number; color: string; children: React.ReactNode }> = ({ progress, color, children }) => {
  const size = 224;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="kp-ring-wrap" role="img" aria-label={`${Math.round(progress * 100)}% complete`}>
      <svg className="kp-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          className="kp-ring-progress"
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="kp-ring-center">{children}</div>
    </div>
  );
};

const Header: React.FC = () => (
  <header className="kp-header">
    <div className="kp-brand"><KnightLogo size={19} /><span>Knight <b>Pomodoro</b></span></div>
    <div className="kp-header-actions">
      <button className="kp-icon-button" onClick={() => openDashboard('stats')} aria-label="Open focus stats" title="Focus stats"><BarChart3 size={17} /></button>
      <button className="kp-icon-button" onClick={() => openDashboard('settings')} aria-label="Open timer settings" title="Timer settings"><Settings2 size={17} /></button>
    </div>
  </header>
);

const Sessions: React.FC<{ completed: number; total: number }> = ({ completed, total }) => (
  <div className="kp-sessions" aria-label={`${completed} of ${total} focus sessions completed in this cycle`}>
    {Array.from({ length: total }, (_, index) => (
      <span key={index} className={`kp-session-dot ${index < completed ? 'is-complete' : ''}`} />
    ))}
    <span className="kp-session-caption">{completed} of {total} sessions</span>
  </div>
);

const App: React.FC = () => {
  const data = useAppData();
  const dataRef = useRef(data);
  const [displayMs, setDisplayMs] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => {
    const tick = () => {
      const current = dataRef.current;
      if (!current) return;
      setDisplayMs(getRemainingMs(current.timerState));
      setProgress(getPhaseProgress(current.timerState));
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, []);

  if (!data) return <div className="kp-popup kp-loading">Loading your timer…</div>;

  const { timerState, settings, dailyStats } = data;
  const phase = timerState.currentState;
  const isPaused = timerState.pausedAt !== null;
  const isWaitingForBreak = (phase === 'shortBreak' || phase === 'longBreak') && isPaused;
  const today = dailyStats[todayKey()] ?? { focusedTime: 0, unfocusedTime: 0, completedSessions: 0 };
  const total = Math.max(1, settings.longBreakInterval);
  const sessionCount = Math.min(timerState.currentCycle, total);

  let phaseName = 'Ready to focus';
  let phaseNote = `${minutes(settings.focusDuration)} minute focus · ${minutes(settings.shortBreakDuration)} minute break`;
  let phaseColor = '#bd5546';
  if (phase === 'focus') {
    phaseName = isPaused ? 'Focus paused' : 'Focus session';
    phaseNote = isPaused ? 'Pick up where you left off' : 'Stay with one task until the timer ends';
  } else if (phase === 'shortBreak' || phase === 'longBreak') {
    const long = phase === 'longBreak';
    phaseName = isWaitingForBreak ? 'Break is ready' : isPaused ? 'Break paused' : long ? 'Long break' : 'Short break';
    phaseNote = isWaitingForBreak ? 'You finished a focus session. Take a moment to recharge.' : 'Step away from your screen if you can';
    phaseColor = '#4f8066';
  }

  const idle = phase === 'idle';

  return (
    <div className={`kp-popup ${phase === 'focus' ? 'is-focus' : ''} ${phase.includes('Break') ? 'is-break' : ''}`}>
      <Header />
      <main className="kp-main">
        <div className="kp-phase-label"><span className={`kp-status-dot ${idle ? '' : isPaused ? 'is-paused' : 'is-running'}`} />{phaseName}</div>
        <p className="kp-phase-note">{phaseNote}</p>

        <ProgressRing progress={idle ? 0 : progress} color={phaseColor}>
          <span className="kp-time" aria-live="off">{formatTime(idle ? settings.focusDuration : displayMs)}</span>
          <span className="kp-time-caption">{idle ? 'FOCUS' : isPaused ? 'PAUSED' : phase === 'focus' ? 'FOCUS' : 'BREAK'}</span>
        </ProgressRing>

        {(phase === 'focus' || idle) && <Sessions completed={sessionCount} total={total} />}

        <div className="kp-controls">
          {idle && (
            <button className="kp-primary" onClick={() => send('START_FOCUS')}>
              <Play size={17} fill="currentColor" /> Start focus
            </button>
          )}
          {phase === 'focus' && (
            <>
              {isPaused ? (
                <button className="kp-primary" onClick={() => send('RESUME')}><Play size={17} fill="currentColor" /> Resume</button>
              ) : (
                <button className="kp-primary" onClick={() => send('PAUSE')} disabled={settings.strictMode} title={settings.strictMode ? 'Pause is disabled in strict mode' : undefined}>
                  <Pause size={17} fill="currentColor" /> {settings.strictMode ? 'Focus locked' : 'Pause'}
                </button>
              )}
              <button className="kp-secondary" onClick={() => send('STOP')} title="End this focus session"><Square size={15} /> End</button>
              {!settings.strictMode && <button className="kp-secondary kp-skip" onClick={() => send('SKIP')} title="Skip to the break"><SkipForward size={16} /><span>Skip</span></button>}
            </>
          )}
          {(phase === 'shortBreak' || phase === 'longBreak') && (
            <>
              {isWaitingForBreak ? (
                <button className="kp-primary kp-break-primary" onClick={() => send('START_BREAK')}><Coffee size={17} /> Start break</button>
              ) : isPaused ? (
                <button className="kp-primary kp-break-primary" onClick={() => send('RESUME')}><Play size={17} fill="currentColor" /> Resume break</button>
              ) : (
                <button className="kp-primary kp-break-primary" onClick={() => send('PAUSE')}><Pause size={17} fill="currentColor" /> Pause break</button>
              )}
              <button className="kp-secondary" onClick={() => send('SKIP')} title="Skip this break"><SkipForward size={16} /> Skip</button>
              <button className="kp-secondary kp-reset" onClick={() => send('STOP')} title="End the break and return to focus"><RotateCcw size={15} /></button>
            </>
          )}
        </div>

        <div className="kp-today" aria-label="Today's focus summary">
          <div><span className="kp-today-value">{minutes(today.focusedTime)}m</span><span>focused today</span></div>
          <span className="kp-today-divider" />
          <div><span className="kp-today-value">{today.completedSessions}</span><span>sessions done</span></div>
        </div>
      </main>
      <footer className="kp-footer">
        <span><CircleHelp size={14} /> The Pomodoro technique: focus, then rest.</span>
        <button onClick={() => openDashboard('settings')} aria-label="Adjust focus and break lengths">Adjust</button>
      </footer>
    </div>
  );
};

export default App;
