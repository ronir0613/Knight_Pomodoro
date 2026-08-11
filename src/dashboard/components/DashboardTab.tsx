import React from 'react';
import { AppData } from '../../storage/models';
import { getTodayDateString } from '../../storage/storage';

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

  // Simple progress bar
  const focusedPercent = totalTime > 0 ? (todayStats.focusedTime / totalTime) * 100 : 0;
  const unfocusedPercent = totalTime > 0 ? (todayStats.unfocusedTime / totalTime) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Today Overview */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Today's Focus</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Focused Time</div>
            <div className="text-3xl font-bold text-knight-accent">{formatHoursMins(todayStats.focusedTime)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Unfocused Time</div>
            <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{formatHoursMins(todayStats.unfocusedTime)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Focus Ratio</div>
            <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{focusRatio.toFixed(1)}%</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Completed Sessions</div>
            <div className="text-3xl font-bold text-gray-700 dark:text-gray-200">{todayStats.completedSessions}</div>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Time Distribution</h3>
          
          <div className="h-8 flex rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900 mb-4">
            <div 
              style={{ width: `${focusedPercent}%` }} 
              className="bg-knight-accent transition-all duration-1000"
              title={`Focused: ${formatHoursMins(todayStats.focusedTime)}`}
            />
            <div 
              style={{ width: `${unfocusedPercent}%` }} 
              className="bg-gray-300 dark:bg-gray-600 transition-all duration-1000"
              title={`Unfocused: ${formatHoursMins(todayStats.unfocusedTime)}`}
            />
          </div>
          
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-knight-accent"></div>
              <span>Focused ({focusedPercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <span>Unfocused ({unfocusedPercent.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default DashboardTab;
