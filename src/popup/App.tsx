import React, { useEffect, useState } from 'react';
import { useAppData } from '../utils/useAppData';
import { formatTime, getActualRemainingTime } from '../utils/formatTime';
import { Play, Pause, Square, SkipForward, BarChart2, Settings } from 'lucide-react';

const App: React.FC = () => {
  const data = useAppData();
  const [displayTime, setDisplayTime] = useState<number>(0);

  useEffect(() => {
    if (!data) return;
    
    // Update display time every second if timer is running
    const interval = setInterval(() => {
      setDisplayTime(getActualRemainingTime(data.timerState));
    }, 100);
    
    // Initial set
    setDisplayTime(getActualRemainingTime(data.timerState));

    return () => clearInterval(interval);
  }, [data?.timerState]);

  if (!data) return <div className="p-4 flex justify-center items-center h-full">Loading...</div>;

  const { timerState } = data;
  const isRunning = timerState.phase !== 'IDLE' && !timerState.pausedTime;

  const handleStartResume = () => {
    chrome.runtime.sendMessage({ type: timerState.phase === 'IDLE' ? 'START_TIMER' : 'RESUME_TIMER' });
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_TIMER' });
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
  };

  const handleSkip = () => {
    chrome.runtime.sendMessage({ type: 'SKIP_PHASE' });
  };

  const openDashboard = () => {
    chrome.runtime.openOptionsPage();
  };

  // Determine phase label and color
  let phaseLabel = 'Ready to Focus';
  let phaseColor = 'text-knight-text';
  if (timerState.phase === 'FOCUS') {
    phaseLabel = 'Focusing';
    phaseColor = 'text-red-500'; // Or some other primary
  } else if (timerState.phase === 'SHORT_BREAK') {
    phaseLabel = 'Short Break';
    phaseColor = 'text-green-500';
  } else if (timerState.phase === 'LONG_BREAK') {
    phaseLabel = 'Long Break';
    phaseColor = 'text-blue-500';
  }

  return (
    <div className={`flex flex-col h-full bg-knight-light dark:bg-knight-dark text-knight-text dark:text-knight-textDark ${data.settings.theme === 'dark' ? 'dark' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <span className="text-knight-accent">◈</span> Knight Pomodoro
        </h1>
        <div className="flex gap-2">
          <button onClick={openDashboard} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition">
            <BarChart2 size={18} />
          </button>
          <button onClick={openDashboard} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Main Timer */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={`text-sm font-medium uppercase tracking-widest mb-4 ${phaseColor}`}>
          {phaseLabel}
        </div>
        <div className="text-6xl font-light mb-8 tabular-nums tracking-tight">
          {formatTime(displayTime)}
        </div>

        {/* Controls */}
        <div className="flex gap-4 items-center">
          {isRunning ? (
            <button onClick={handlePause} className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition">
              <Pause size={24} className="fill-current" />
            </button>
          ) : (
            <button onClick={handleStartResume} className="w-14 h-14 rounded-full bg-knight-accent text-white flex items-center justify-center hover:brightness-110 transition shadow-lg">
              <Play size={28} className="fill-current ml-1" />
            </button>
          )}

          <button 
            onClick={handleStop} 
            disabled={timerState.phase === 'IDLE'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${timerState.phase === 'IDLE' ? 'opacity-50 cursor-not-allowed text-gray-400' : 'bg-gray-200 dark:bg-gray-800 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400'}`}
          >
            <Square size={20} className="fill-current" />
          </button>

          <button 
            onClick={handleSkip} 
            disabled={timerState.phase === 'IDLE'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${timerState.phase === 'IDLE' ? 'opacity-50 cursor-not-allowed text-gray-400' : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'}`}
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 text-xs flex justify-between items-center text-gray-500 dark:text-gray-400">
        <span>Today's Sessions: {timerState.completedFocusSessions}</span>
        {/* We can load today's stats to show focused time if we want */}
      </div>
    </div>
  );
};

export default App;
