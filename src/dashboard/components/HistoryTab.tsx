import React from 'react';
import { AppData, FocusSession } from '../../storage/models';

interface Props {
  data: AppData;
}

const HistoryTab: React.FC<Props> = ({ data }) => {
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (ms: number) => {
    return `${Math.round(ms / 60000)}m`;
  };

  // Group by date
  const grouped: Record<string, FocusSession[]> = {};
  data.sessionHistory.forEach(session => {
    const d = formatDate(session.endTime);
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(session);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold mb-6">Session History</h2>
      
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-500">No sessions recorded yet.</div>
      ) : (
        <div className="space-y-8">
          {Object.keys(grouped).map(date => (
            <div key={date} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 font-semibold">
                {date}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {grouped[date].map(session => (
                  <div key={session.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex items-center gap-4">
                      <div className="text-gray-500 dark:text-gray-400 w-16">{formatTime(session.startTime)}</div>
                      <div className={`font-medium ${session.type === 'FOCUS' ? 'text-knight-text dark:text-gray-200' : 'text-gray-500'}`}>
                        {session.type === 'FOCUS' ? 'Focus' : session.type === 'SHORT_BREAK' ? 'Short Break' : 'Long Break'}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-gray-600 dark:text-gray-400 font-medium">{formatDuration(session.actualDuration)}</div>
                      <div className={`text-sm px-2 py-1 rounded-full ${session.completed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {session.completed ? 'Completed' : 'Interrupted'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
