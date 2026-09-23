import React from 'react';
import { AppData } from '../../storage/models';
import { getTodayDateString } from '../../storage/storage';
import { Flame, Target, TrendingUp, Trophy } from 'lucide-react';

interface Props {
  data: AppData;
}

const formatHoursMins = (ms: number) => {
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

const DashboardTab: React.FC<Props> = ({ data }) => {
  const today = getTodayDateString();
  const todayStats = data.dailyStats[today] || { focusedTime: 0, unfocusedTime: 0, completedSessions: 0 };

  const totalTime = todayStats.focusedTime + todayStats.unfocusedTime;
  const focusRatio = totalTime > 0 ? (todayStats.focusedTime / totalTime) * 100 : 0;

  const focusedPercent = totalTime > 0 ? (todayStats.focusedTime / totalTime) * 100 : 0;
  const unfocusedPercent = totalTime > 0 ? (todayStats.unfocusedTime / totalTime) * 100 : 0;

  return (
    <div className="space-y-10">

      {/* Hero Stats */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-gradient-to-b from-knight-accent to-transparent rounded-full"></div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Today's Performance
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Focused Time Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-knight-accent/50 transition-all duration-300 hover:shadow-2xl hover:shadow-knight-accent/10 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-knight-accent/10 rounded-full blur-3xl group-hover:bg-knight-accent/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-knight-accent/20 rounded-xl">
                  <Flame size={20} className="text-knight-accent" />
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Focused</div>
              </div>
              <div className="text-4xl font-bold text-knight-accent mb-1 tabular-nums">
                {formatHoursMins(todayStats.focusedTime)}
              </div>
              <div className="text-xs text-slate-500">Deep work time</div>
            </div>
          </div>

          {/* Unfocused Time Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl group-hover:bg-slate-500/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-slate-500/20 rounded-xl">
                  <Target size={20} className="text-slate-400" />
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Break Time</div>
              </div>
              <div className="text-4xl font-bold text-slate-300 mb-1 tabular-nums">
                {formatHoursMins(todayStats.unfocusedTime)}
              </div>
              <div className="text-xs text-slate-500">Rest & recharge</div>
            </div>
          </div>

          {/* Focus Ratio Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-500/20 rounded-xl">
                  <TrendingUp size={20} className="text-blue-400" />
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Efficiency</div>
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-1 tabular-nums">
                {focusRatio.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">Focus ratio</div>
            </div>
          </div>

          {/* Sessions Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-green-500/20 rounded-xl">
                  <Trophy size={20} className="text-green-400" />
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Sessions</div>
              </div>
              <div className="text-4xl font-bold text-green-400 mb-1 tabular-nums">
                {todayStats.completedSessions}
              </div>
              <div className="text-xs text-slate-500">Completed today</div>
            </div>
          </div>
        </div>

        {/* Time Distribution Bar */}
        <div className="mt-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-4 bg-knight-accent rounded-full"></div>
            Time Distribution
          </h3>

          <div className="relative h-12 flex rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-inner mb-6">
            <div
              style={{ width: `${focusedPercent}%` }}
              className="bg-gradient-to-r from-knight-accent to-yellow-600 transition-all duration-1000 ease-out relative group/bar"
              title={`Focused: ${formatHoursMins(todayStats.focusedTime)}`}
            >
              {focusedPercent > 15 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {focusedPercent.toFixed(0)}%
                </span>
              )}
            </div>
            <div
              style={{ width: `${unfocusedPercent}%` }}
              className="bg-gradient-to-r from-slate-600 to-slate-700 transition-all duration-1000 ease-out relative"
              title={`Unfocused: ${formatHoursMins(todayStats.unfocusedTime)}`}
            >
              {unfocusedPercent > 15 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {unfocusedPercent.toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-8 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-md bg-gradient-to-br from-knight-accent to-yellow-600 shadow-lg shadow-knight-accent/30"></div>
              <span className="text-slate-300 font-medium">
                Focused <span className="text-slate-500">({focusedPercent.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-md bg-gradient-to-br from-slate-600 to-slate-700"></div>
              <span className="text-slate-300 font-medium">
                Break Time <span className="text-slate-500">({unfocusedPercent.toFixed(0)}%)</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 7-Day Trend */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-transparent rounded-full"></div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            7-Day Trend
          </h2>
        </div>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-end h-64 gap-4 mt-6">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const stats = data.dailyStats[dateStr] || { focusedTime: 0, unfocusedTime: 0, completedSessions: 0 };
              const total = stats.focusedTime + stats.unfocusedTime;

              return { dateStr, label: d.toLocaleDateString(undefined, { weekday: 'short' }), stats, total };
            }).map((day, _, arr) => {
              const maxTime = Math.max(...arr.map(d => d.total), 3600000);
              const focusHeight = (day.stats.focusedTime / maxTime) * 100;
              const unfocusHeight = (day.stats.unfocusedTime / maxTime) * 100;
              const isToday = day.dateStr === today;

              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-3 group/day relative">
                  <div className={`w-full bg-white/5 rounded-lg flex flex-col justify-end h-full overflow-hidden border transition-all duration-300 ${
                    isToday ? 'border-knight-accent shadow-lg shadow-knight-accent/20' : 'border-white/10 group-hover/day:border-white/30'
                  }`}>
                    <div
                      style={{ height: `${unfocusHeight}%` }}
                      className="w-full bg-gradient-to-t from-slate-600 to-slate-500 transition-all duration-700 ease-out"
                    />
                    <div
                      style={{ height: `${focusHeight}%` }}
                      className="w-full bg-gradient-to-t from-knight-accent to-yellow-500 transition-all duration-700 ease-out shadow-inner"
                    />
                  </div>
                  <div className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isToday ? 'text-knight-accent' : 'text-slate-500 group-hover/day:text-slate-300'
                  }`}>
                    {day.label}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover/day:opacity-100 transition-all duration-200 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl pointer-events-none whitespace-nowrap z-20 shadow-2xl border border-white/10 backdrop-blur-xl">
                    <div className="font-semibold mb-1.5 text-slate-300">{day.dateStr}</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-knight-accent"></div>
                        <span className="text-slate-400">Focus:</span>
                        <span className="font-medium text-white">{formatHoursMins(day.stats.focusedTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        <span className="text-slate-400">Break:</span>
                        <span className="font-medium text-white">{formatHoursMins(day.stats.unfocusedTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
};

export default DashboardTab;
