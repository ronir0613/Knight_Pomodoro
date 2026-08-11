import { AppData, DEFAULT_SETTINGS, DEFAULT_TIMER_STATE, TimerState, UserSettings, DailyStats, FocusSession } from './models';

// Key for our entire app state
const STORAGE_KEY = 'knight_pomodoro_data';

export const getAppData = async (): Promise<AppData> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const data = result[STORAGE_KEY] as Partial<AppData> | undefined;

  return {
    settings: { ...DEFAULT_SETTINGS, ...data?.settings },
    timerState: data?.timerState || DEFAULT_TIMER_STATE,
    dailyStats: data?.dailyStats || {},
    sessionHistory: data?.sessionHistory || [],
  };
};

export const setAppData = async (data: Partial<AppData>): Promise<void> => {
  const currentData = await getAppData();
  const newData = { ...currentData, ...data };
  await chrome.storage.local.set({ [STORAGE_KEY]: newData });
};

export const updateTimerState = async (updates: Partial<TimerState>): Promise<TimerState> => {
  const data = await getAppData();
  const newState = { ...data.timerState, ...updates };
  await setAppData({ timerState: newState });
  return newState;
};

export const updateSettings = async (updates: Partial<UserSettings>): Promise<void> => {
  const data = await getAppData();
  const newSettings = { ...data.settings, ...updates };
  
  const newData: Partial<AppData> = {
    settings: newSettings
  };
  
  // Update unstarted timer phase durations immediately so the UI reflects changes
  if (data.timerState.phase === 'IDLE' && updates.focusDuration !== undefined) {
    newData.timerState = {
      ...(newData.timerState || data.timerState),
      remainingDuration: newSettings.focusDuration,
      initialDuration: newSettings.focusDuration
    };
  }
  
  if (data.timerState.phase === 'SHORT_BREAK' && !data.timerState.startTime && updates.shortBreakDuration !== undefined) {
    newData.timerState = {
      ...(newData.timerState || data.timerState),
      remainingDuration: newSettings.shortBreakDuration,
      initialDuration: newSettings.shortBreakDuration
    };
  }

  if (data.timerState.phase === 'LONG_BREAK' && !data.timerState.startTime && updates.longBreakDuration !== undefined) {
    newData.timerState = {
      ...(newData.timerState || data.timerState),
      remainingDuration: newSettings.longBreakDuration,
      initialDuration: newSettings.longBreakDuration
    };
  }

  await setAppData(newData);
};

export const addFocusSession = async (session: FocusSession): Promise<void> => {
  const data = await getAppData();
  // Keep only the last 100 sessions to avoid unbounded growth
  const newHistory = [session, ...data.sessionHistory].slice(0, 100);
  await setAppData({ sessionHistory: newHistory });
};

// Returns 'YYYY-MM-DD' in local time
export const getTodayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const updateDailyStats = async (
  date: string, 
  updates: { focusedTime?: number; unfocusedTime?: number; completedSessions?: number }
): Promise<void> => {
  const data = await getAppData();
  const currentStats = data.dailyStats[date] || {
    date,
    focusedTime: 0,
    unfocusedTime: 0,
    completedSessions: 0
  };

  const newStats: DailyStats = {
    date,
    focusedTime: currentStats.focusedTime + (updates.focusedTime || 0),
    unfocusedTime: currentStats.unfocusedTime + (updates.unfocusedTime || 0),
    completedSessions: currentStats.completedSessions + (updates.completedSessions || 0)
  };

  await setAppData({
    dailyStats: {
      ...data.dailyStats,
      [date]: newStats
    }
  });
};
