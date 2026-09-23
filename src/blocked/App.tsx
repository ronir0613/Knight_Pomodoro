import React, { useEffect, useState } from 'react';
import { useAppData } from '../utils/useAppData';
import { formatTime, getActualRemainingTime } from '../utils/formatTime';
import { KnightLogo } from '../components/KnightLogo';
import { Shield, Clock, Lock } from 'lucide-react';

const App: React.FC = () => {
  const data = useAppData();
  const [displayTime, setDisplayTime] = useState<number>(0);
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const blockedUrl = searchParams.get('url');
    if (blockedUrl) {
      try {
        const urlObj = new URL(blockedUrl);
        setUrl(urlObj.hostname);
      } catch {
        setUrl(blockedUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!data) return;

    const interval = setInterval(() => {
      setDisplayTime(getActualRemainingTime(data.timerState));
    }, 1000);

    setDisplayTime(getActualRemainingTime(data.timerState));

    return () => clearInterval(interval);
  }, [data?.timerState]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-knight-accent mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans selection:bg-knight-accent/30 overflow-hidden">

      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-knight-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl w-full text-center space-y-12 relative z-10">

        {/* Shield Icon with Logo */}
        <div className="flex justify-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative p-8 bg-gradient-to-br from-red-950/50 to-slate-900/50 rounded-3xl border border-red-500/30 shadow-2xl backdrop-blur-xl">
              <div className="relative">
                <Shield size={80} className="text-red-500/80 mx-auto" strokeWidth={1.5} />
                <Lock size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="inline-block px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full backdrop-blur-sm">
            <span className="text-sm font-bold uppercase tracking-widest text-red-400 flex items-center gap-2 justify-center">
              <Lock size={14} />
              Site Blocked
            </span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
            {url ? (
              <>
                <span className="text-red-400">{url}</span>
                <br />
                <span className="text-3xl">is currently blocked</span>
              </>
            ) : (
              'This site is blocked'
            )}
          </h1>

          <p className="text-slate-400 text-xl max-w-lg mx-auto leading-relaxed">
            You're in <span className="text-knight-accent font-semibold">strict focus mode</span>. Stay strong and finish your session.
          </p>
        </div>

        {/* Timer Display */}
        <div className="py-12 animate-in fade-in zoom-in duration-700 delay-300">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Clock size={20} className="text-knight-accent" />
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-knight-accent">
                Time Remaining
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-knight-accent/20 blur-3xl rounded-full"></div>
              <div className="relative text-8xl font-extralight tabular-nums tracking-tighter text-white drop-shadow-2xl">
                {formatTime(displayTime)}
              </div>
            </div>

            {data.timerState.pausedTime && (
              <div className="mt-6 text-sm text-slate-500 uppercase tracking-wider">
                Session Paused
              </div>
            )}
          </div>
        </div>

        {/* Footer Message */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="flex items-center justify-center gap-3 text-slate-500">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1"></div>
            <KnightLogo size={20} />
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent flex-1"></div>
          </div>

          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            To break this lock early, open the Knight Pomodoro extension popup and hold the Stop button for {data.settings.strictLockDelaySeconds} seconds.
          </p>

          <p className="text-xs text-slate-600 italic">
            "Focus is the gateway to excellence"
          </p>
        </div>

      </div>
    </div>
  );
};

export default App;
