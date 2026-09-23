import {
  AppData,
  DailyStats,
  DEFAULT_FLOATING_TIMER_UI,
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_STATE,
  DEFAULT_TRACKING_STATE,
  FloatingTimerUI,
  TimerState,
  TrackingState,
  UserSettings,
} from './models';

const STORAGE_KEY = 'knight_pomodoro_data';

// ─── Shape migration guard ────────────────────────────────────────────────────
// Detect the old storage shape (had `remainingDuration` / `startTime` / `pausedTime`).
// On match, silently reset timerState to defaults (settings + stats are preserved).
// Zero real installs exist, so no data is lost in practice.
function migrateTimerState(raw: any): TimerState {
  if (!raw) return DEFAULT_TIMER_STATE;

  // Old shape had 'phase' (string enum) and 'remainingDuration'
  if ('phase' in raw || 'remainingDuration' in raw) {
    console.log('[KP] Detected old timer state shape — resetting to defaults.');
    return DEFAULT_TIMER_STATE;
  }

  // Validate new shape minimally
  if (typeof raw.currentState !== 'string') return DEFAULT_TIMER_STATE;

  return raw as TimerState;
}

// ─── Core read/write ──────────────────────────────────────────────────────────

export const getAppData = async (): Promise<AppData> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as Partial<AppData> | undefined;

  return {
    settings: { ...DEFAULT_SETTINGS, ...raw?.settings },
    timerState: migrateTimerState(raw?.timerState),
    trackingState: { ...DEFAULT_TRACKING_STATE, ...raw?.trackingState },
    dailyStats: raw?.dailyStats ?? {},
    floatingTimerUI: { ...DEFAULT_FLOATING_TIMER_UI, ...raw?.floatingTimerUI },
  };
};

const setAppData = async (data: Partial<AppData>): Promise<void> => {
  const currentData = await getAppData();
  const newData = { ...currentData, ...data };
  await chrome.storage.local.set({ [STORAGE_KEY]: newData });
};

// ─── Typed partial-update helpers (callers use these, never chrome.storage directly) ─

export const updateTimerState = async (updates: Partial<TimerState>): Promise<TimerState> => {
  const data = await getAppData();
  const newState: TimerState = { ...data.timerState, ...updates };
  await setAppData({ timerState: newState });
  return newState;
};

export const updateSettings = async (updates: Partial<UserSettings>): Promise<void> => {
  const data = await getAppData();
  const newSettings: UserSettings = { ...data.settings, ...updates };

  const patch: Partial<AppData> = { settings: newSettings };

  // If timer is idle, immediately reflect new focus duration in remainingMs
  if (data.timerState.currentState === 'idle' && updates.focusDuration !== undefined) {
    patch.timerState = {
      ...data.timerState,
      remainingMs: newSettings.focusDuration,
      phaseDurationMs: newSettings.focusDuration,
    };
  }

  await setAppData(patch);
};

export const updateTrackingState = async (
  updates: Partial<TrackingState>
): Promise<TrackingState> => {
  const data = await getAppData();
  const newState: TrackingState = { ...data.trackingState, ...updates };
  await setAppData({ trackingState: newState });
  return newState;
};

export const updateFloatingTimerUI = async (
  updates: Partial<FloatingTimerUI>
): Promise<void> => {
  const data = await getAppData();
  const newUI: FloatingTimerUI = { ...data.floatingTimerUI, ...updates };
  await setAppData({ floatingTimerUI: newUI });
};

/**
 * Read only the FloatingTimerUI slice from storage, merged with defaults.
 * Lighter than getAppData() — skips the timer-state migration path.
 * Used by the content script to restore pill position/collapsed state on mount
 * without depending on a full AppData read.
 */
export const getFloatingTimerUI = async (): Promise<FloatingTimerUI> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as Partial<AppData> | undefined;
  return { ...DEFAULT_FLOATING_TIMER_UI, ...raw?.floatingTimerUI };
};

// ─── Stats helpers ────────────────────────────────────────────────────────────

export const getTodayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Atomically accumulate focusedMs and/or unfocusedMs into a day's stats.
 * Used by the periodic flush alarm — called with small increments, not totals.
 */
export const incrementDailyTime = async (
  date: string,
  focusedMs: number,
  unfocusedMs: number
): Promise<void> => {
  if (focusedMs === 0 && unfocusedMs === 0) return;

  const data = await getAppData();
  const existing: DailyStats = data.dailyStats[date] ?? {
    date,
    focusedTime: 0,
    unfocusedTime: 0,
    completedSessions: 0,
  };

  const updated: DailyStats = {
    ...existing,
    focusedTime: existing.focusedTime + focusedMs,
    unfocusedTime: existing.unfocusedTime + unfocusedMs,
  };

  await setAppData({
    dailyStats: { ...data.dailyStats, [date]: updated },
  });
};

/**
 * Increment completedSessions for a given day.
 */
export const incrementDailySession = async (date: string): Promise<void> => {
  const data = await getAppData();
  const existing: DailyStats = data.dailyStats[date] ?? {
    date,
    focusedTime: 0,
    unfocusedTime: 0,
    completedSessions: 0,
  };

  await setAppData({
    dailyStats: {
      ...data.dailyStats,
      [date]: { ...existing, completedSessions: existing.completedSessions + 1 },
    },
  });
};

/**
 * Reset only stats (dailyStats). Settings and timer state are preserved.
 */
export const resetStats = async (): Promise<void> => {
  await setAppData({ dailyStats: {} });
};

/**
 * Export full app data as a JSON string (for the Data > Export button).
 */
export const exportAppData = async (): Promise<string> => {
  const data = await getAppData();
  return JSON.stringify(data, null, 2);
};
