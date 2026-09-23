import React from 'react';
import { AppData } from '../../storage/models';

interface Props {
  data: AppData;
}

const fmt = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const weekKeys = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
    };
  });

const StatsTab: React.FC<Props> = ({ data }) => {
  const today = todayKey();
  const todayStats = data.dailyStats[today] ?? { focusedTime: 0, unfocusedTime: 0, completedSessions: 0 };

  const days = weekKeys();
  const maxTime = Math.max(
    ...days.map(({ key }) => {
      const s = data.dailyStats[key];
      return s ? s.focusedTime + s.unfocusedTime : 0;
    }),
    1
  );

  const weekSessions = days.reduce((sum, { key }) => {
    return sum + (data.dailyStats[key]?.completedSessions ?? 0);
  }, 0);

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-gradient-to-b from-knight-accent to-transparent rounded-full" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Today
          </h2>
        </div>

        {/* Today's top stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Focused */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-knight-accent/40 transition-all duration-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-knight-accent/8 rounded-full blur-2xl" />
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-semibold">Focused</div>
            <div className="text-4xl font-bold text-knight-accent tabular-nums">{fmt(todayStats.focusedTime)}</div>
            <div className="text-xs text-slate-600 mt-1">deep work</div>
          </div>

          {/* Unfocused */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/8 rounded-full blur-2xl" />
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-semibold">Browsing</div>
            <div className="text-4xl font-bold text-slate-300 tabular-nums">{fmt(todayStats.unfocusedTime)}</div>
            <div className="text-xs text-slate-600 mt-1">no session running</div>
          </div>

          {/* Sessions */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-green-500/40 transition-all duration-300 hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/8 rounded-full blur-2xl" />
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-semibold">Sessions</div>
            <div className="text-4xl font-bold text-green-400 tabular-nums">{todayStats.completedSessions}</div>
            <div className="text-xs text-slate-600 mt-1">completed today</div>
          </div>
        </div>

        {/* Focus vs unfocused bar */}
        {(todayStats.focusedTime + todayStats.unfocusedTime) > 0 && (() => {
          const total = todayStats.focusedTime + todayStats.unfocusedTime;
          const fp = (todayStats.focusedTime / total) * 100;
          const up = (todayStats.unfocusedTime / total) * 100;
          return (
            <div className="mt-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                <span className="font-semibold uppercase tracking-widest">Time split</span>
              </div>
              <div className="h-8 flex rounded-xl overflow-hidden bg-white/5 border border-white/8">
                <div
                  style={{ width: `${fp}%` }}
                  className="bg-gradient-to-r from-knight-accent to-yellow-600 transition-all duration-700 ease-out flex items-center justify-center"
                  title={`Focused: ${fmt(todayStats.focusedTime)}`}
                >
                  {fp > 15 && (
                    <span className="text-xs font-bold text-white">{fp.toFixed(0)}%</span>
                  )}
                </div>
                <div
                  style={{ width: `${up}%` }}
                  className="bg-gradient-to-r from-slate-600 to-slate-700 transition-all duration-700 ease-out flex items-center justify-center"
                  title={`Browsing: ${fmt(todayStats.unfocusedTime)}`}
                >
                  {up > 15 && (
                    <span className="text-xs font-bold text-slate-300">{up.toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div className="flex gap-5 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-knight-accent to-yellow-600" />
                  <span className="text-slate-400">Focused</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-slate-600" />
                  <span className="text-slate-400">Browsing</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 7-day chart */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-transparent rounded-full" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Last 7 Days
          </h2>
          <span className="text-sm text-slate-500 ml-auto">
            {weekSessions} session{weekSessions !== 1 ? 's' : ''} this week
          </span>
        </div>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10">
          <div className="flex items-end h-48 gap-3">
            {days.map(({ key, label }) => {
              const s = data.dailyStats[key] ?? { focusedTime: 0, unfocusedTime: 0, completedSessions: 0 };
              const fh = (s.focusedTime / maxTime) * 100;
              const uh = (s.unfocusedTime / maxTime) * 100;
              const isToday = key === today;

              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-2 group/day relative">
                  <div className={`w-full bg-white/5 rounded-lg flex flex-col justify-end h-full overflow-hidden border transition-all duration-300 ${
                    isToday ? 'border-knight-accent/60 shadow-lg shadow-knight-accent/15' : 'border-white/8 group-hover/day:border-white/20'
                  }`}>
                    <div style={{ height: `${uh}%` }} className="w-full bg-gradient-to-t from-slate-600 to-slate-500 transition-all duration-700" />
                    <div style={{ height: `${fh}%` }} className="w-full bg-gradient-to-t from-knight-accent to-yellow-500 transition-all duration-700" />
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isToday ? 'text-knight-accent' : 'text-slate-600 group-hover/day:text-slate-400'
                  }`}>
                    {label}
                  </span>

                  {/* Tooltip */}
                  {(s.focusedTime + s.unfocusedTime) > 0 && (
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover/day:opacity-100 transition-all duration-200 bg-slate-900 text-xs px-3 py-2 rounded-xl pointer-events-none whitespace-nowrap z-20 shadow-2xl border border-white/10">
                      <div className="text-slate-400 mb-1">{key}</div>
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-knight-accent" />
                        <span className="text-white">{fmt(s.focusedTime)}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        <span className="text-slate-400">{fmt(s.unfocusedTime)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
