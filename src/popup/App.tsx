import React, { useEffect, useState } from 'react';
import { useAppData } from '../utils/useAppData';
import { formatTime, getActualRemainingTime } from '../utils/formatTime';
import { Play, Pause, Square, SkipForward, BarChart2, Settings, Minimize2, Maximize2 } from 'lucide-react';
import { KnightLogo } from '../components/KnightLogo';
import { getTodayDateString } from '../storage/storage';

const App: React.FC = () => {
  const data = useAppData();
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [todayFocusedTime, setTodayFocusedTime] = useState<number>(0);
  const [isMiniMode, setIsMiniMode] = useState(false);

  useEffect(() => {
    if (!data) return;

    const interval = setInterval(() => {
      setDisplayTime(getActualRemainingTime(data.timerState));
    }, 100);

    setDisplayTime(getActualRemainingTime(data.timerState));

    const today = getTodayDateString();
    if (data.dailyStats[today]) {
      setTodayFocusedTime(data.dailyStats[today].focusedTime);
    }

    return () => clearInterval(interval);
  }, [data]);

  const executeStop = () => {
    chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
  };



  if (!data) {
    return (
      <div className="flex justify-center items-center h-[500px] w-[350px] bg-gradient-to-br from-slate-950 to-slate-900 text-slate-400 overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-knight-accent mx-auto mb-4"></div>
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const { timerState, settings } = data;
  const isRunning = timerState.phase !== 'IDLE' && !timerState.pausedTime;
  const isStrictFocus = timerState.phase === 'FOCUS' && settings.strictModeEnabled;
  const isIdle = timerState.phase === 'IDLE';
  const isFocusPhase = timerState.phase === 'FOCUS';
  const isBreakPhase = timerState.phase === 'SHORT_BREAK' || timerState.phase === 'LONG_BREAK';
  const isBreakWaiting = isBreakPhase && !!timerState.pausedTime;
  const isPausedFocus = isFocusPhase && !!timerState.pausedTime;

  const handleStartResume = () => {
    chrome.runtime.sendMessage({ type: timerState.phase === 'IDLE' ? 'START_TIMER' : 'RESUME_TIMER' });
  };

  const handlePause = () => {
    if (isStrictFocus) return;
    chrome.runtime.sendMessage({ type: 'PAUSE_TIMER' });
  };

  const handleSkip = () => {
    chrome.runtime.sendMessage({ type: 'SKIP_PHASE' });
  };

  const openDashboard = (tab: string) => () => {
    chrome.tabs.create({ url: `options.html?tab=${tab}` });
  };

  let phaseLabel = 'Ready to Focus';
  let ringColor = '#64748b';
  let glowColor = 'transparent';
  let bgGradient = 'from-slate-950 to-slate-900';

  if (timerState.phase === 'FOCUS') {
    phaseLabel = 'Focus Mode';
    ringColor = '#ef4444';
    glowColor = 'rgba(239, 68, 68, 0.15)';
    bgGradient = 'from-red-950/20 to-slate-950';
  } else if (timerState.phase === 'SHORT_BREAK') {
    phaseLabel = 'Short Break';
    ringColor = '#22c55e';
    glowColor = 'rgba(34, 197, 94, 0.15)';
    bgGradient = 'from-green-950/20 to-slate-950';
  } else if (timerState.phase === 'LONG_BREAK') {
    phaseLabel = 'Long Break';
    ringColor = '#3b82f6';
    glowColor = 'rgba(59, 130, 246, 0.15)';
    bgGradient = 'from-blue-950/20 to-slate-950';
  }

  const progress = timerState.initialDuration > 0 ? (timerState.initialDuration - displayTime) / timerState.initialDuration : 0;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  const formatHoursMins = (ms: number) => {
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Mini mode UI
  if (isMiniMode) {
    return (
      <div
        onClick={() => setIsMiniMode(false)}
        className={`flex flex-col w-[140px] h-[140px] items-center justify-center bg-gradient-to-br ${bgGradient} text-white select-none cursor-pointer hover:scale-105 transition-transform ${data.settings.theme === 'dark' ? 'dark' : ''}`}
        title="Click to expand"
      >
        <div className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors">
          <Maximize2 size={14} />
        </div>
        <div className="text-4xl font-extralight tabular-nums tracking-tight text-white drop-shadow-lg">
          {formatTime(displayTime)}
        </div>
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] mt-3 opacity-60" style={{ color: ringColor }}>
          {phaseLabel}
        </div>
      </div>
    );
  }

  // Full mode UI
  return (
    <div
      className={`flex flex-col w-[350px] h-[500px] bg-gradient-to-br ${bgGradient} text-slate-100 select-none ${data.settings.theme === 'dark' ? 'dark' : ''}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 border-b border-white/5 backdrop-blur-sm">
        <h1 className="font-medium text-sm flex items-center gap-2 tracking-tight text-white/90">
          <KnightLogo size={18} /> Knight Pomodoro
        </h1>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMiniMode(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200"
            title="Mini Mode"
          >
            <Minimize2 size={14} />
          </button>
          <button
            onClick={openDashboard('dashboard')}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200"
            title="Dashboard"
          >
            <BarChart2 size={14} />
          </button>
          <button
            onClick={openDashboard('settings')}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Main Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">

        {/* Progress Ring */}
        <div className="relative flex items-center justify-center mb-8">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-30"
            style={{ background: ringColor }}
          />
          <svg width="240" height="240" className="transform -rotate-90 relative z-10">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={ringColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="text-white/5"
            />
            <circle
              cx="120"
              cy="120"
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth="6"
              fill="transparent"
              strokeLinecap="round"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                transition: 'stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: `drop-shadow(0 0 6px ${glowColor})`
              }}
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center">
            <div
              className="text-[8px] font-bold uppercase tracking-[0.25em] mb-2 opacity-50"
              style={{ color: ringColor }}
            >
              {phaseLabel}
            </div>
            <div className="text-5xl font-extralight tabular-nums tracking-tighter text-white mb-0">
              {formatTime(displayTime)}
            </div>
            {timerState.pausedTime && isBreakWaiting && (
              <div className="text-xs uppercase tracking-wider mt-1 font-semibold" style={{ color: ringColor }}>Break Ready</div>
            )}
            {timerState.pausedTime && !isBreakWaiting && (
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Paused</div>
            )}
          </div>
        </div>

        {/* Session Indicator Dots */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: settings.longBreakInterval }).map((_, i) => {
            const completed = i < (timerState.completedFocusSessions % settings.longBreakInterval);
            return (
              <div
                key={i}
                className={`transition-all duration-500 rounded-full ${
                  completed
                    ? 'w-2.5 h-2.5 bg-knight-accent shadow-[0_0_10px_rgba(212,175,55,0.8)] scale-105'
                    : 'w-2 h-2 bg-white/10'
                }`}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">

          {/* IDLE — Start */}
          {isIdle && (
            <button
              onClick={handleStartResume}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-knight-accent to-yellow-600 text-white flex items-center justify-center hover:scale-105 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all duration-300 cursor-pointer shadow-lg"
              title="Start Focus"
            >
              <Play size={26} className="fill-current ml-0.5" />
            </button>
          )}

          {/* FOCUS running — Pause + Stop */}
          {isRunning && isFocusPhase && (
            <>
              <button
                onClick={handlePause}
                disabled={isStrictFocus}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer backdrop-blur-sm
                  ${isStrictFocus
                    ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-105 text-white border border-white/10'}`}
                title={isStrictFocus ? 'Pause disabled in strict mode' : 'Pause'}
              >
                <Pause size={22} className="fill-current" />
              </button>
              <button
                onClick={executeStop}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500/20 hover:scale-105 text-slate-400 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer backdrop-blur-sm"
                title="Stop"
              >
                <Square size={18} className="fill-current" />
              </button>
            </>
          )}

          {/* FOCUS paused — Resume + Stop */}
          {isPausedFocus && (
            <>
              <button
                onClick={handleStartResume}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-knight-accent to-yellow-600 text-white flex items-center justify-center hover:scale-105 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all duration-300 cursor-pointer shadow-lg"
                title="Resume"
              >
                <Play size={26} className="fill-current ml-0.5" />
              </button>
              <button
                onClick={executeStop}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500/20 hover:scale-105 text-slate-400 hover:text-red-400 border border-white/10 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer backdrop-blur-sm"
                title="Stop"
              >
                <Square size={18} className="fill-current" />
              </button>
            </>
          )}

          {/* Break waiting (autoStartBreaks off) — Start Break + Skip */}
          {isBreakWaiting && (
            <>
              <button
                onClick={handleStartResume}
                className="w-16 h-16 rounded-full flex items-center justify-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg text-white"
                style={{ background: `linear-gradient(135deg, ${ringColor}bb, ${ringColor})` }}
                title="Start Break"
              >
                <Play size={26} className="fill-current ml-0.5" />
              </button>
              <button
                onClick={handleSkip}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 text-white border border-white/10 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer backdrop-blur-sm"
                title="Skip Break"
              >
                <SkipForward size={18} />
              </button>
            </>
          )}

          {/* Break running — Pause + Skip */}
          {isRunning && isBreakPhase && (
            <>
              <button
                onClick={handlePause}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 text-white border border-white/10 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer backdrop-blur-sm"
                title="Pause"
              >
                <Pause size={22} className="fill-current" />
              </button>
              <button
                onClick={handleSkip}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 text-white border border-white/10 flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer backdrop-blur-sm"
                title="Skip Break"
              >
                <SkipForward size={18} />
              </button>
            </>
          )}

        </div>

        {/* Footer Stats */}
        <div className="px-4 py-4 bg-white/5 backdrop-blur-sm border-t border-white/5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-knight-accent shadow-[0_0_6px_rgba(212,175,55,0.6)]"></div>
              <span className="text-xs font-medium">{timerState.completedFocusSessions}</span>
              <span className="text-slate-500 text-[10px]">sessions</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <BarChart2 size={10} className="text-knight-accent"/>
              <span className="text-xs font-medium">{formatHoursMins(todayFocusedTime)}</span>
              <span className="text-slate-500 text-[10px]">focused</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;