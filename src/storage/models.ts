export type TimerPhase = 'IDLE' | 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export interface TimerState {
  phase: TimerPhase;
  startTime: number | null; // Timestamp when current phase started/resumed
  pausedTime: number | null; // Timestamp when paused
  remainingDuration: number; // Remaining time in ms
  initialDuration: number; // Total length of the phase in ms
  completedFocusSessions: number; // To determine when a long break is due
}

export interface FocusSession {
  id: string;             // UUID or timestamp-based ID
  startTime: number;
  endTime: number;
  plannedDuration: number;
  actualDuration: number;
  type: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  completed: boolean;
}

export interface DailyStats {
  date: string;           // 'YYYY-MM-DD'
  focusedTime: number;    // Total ms focused
  unfocusedTime: number;  // Total ms unfocused
  completedSessions: number;
}

export interface UserSettings {
  focusDuration: number;      // ms (default 25m)
  shortBreakDuration: number; // ms (default 5m)
  longBreakDuration: number;  // ms (default 15m)
  longBreakInterval: number;  // (default 4)
  autoStartBreaks: boolean;   // default false
  autoStartFocus: boolean;    // default false
  theme: 'light' | 'dark' | 'system';
  idleThreshold: number;      // seconds (e.g., 300 for 5 mins)
}

export interface AppData {
  settings: UserSettings;
  timerState: TimerState;
  dailyStats: Record<string, DailyStats>; // Keyed by date
  sessionHistory: FocusSession[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  focusDuration: 25 * 60 * 1000,
  shortBreakDuration: 5 * 60 * 1000,
  longBreakDuration: 15 * 60 * 1000,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  theme: 'system',
  idleThreshold: 300 // 5 minutes
};

export const DEFAULT_TIMER_STATE: TimerState = {
  phase: 'IDLE',
  startTime: null,
  pausedTime: null,
  remainingDuration: 25 * 60 * 1000,
  initialDuration: 25 * 60 * 1000,
  completedFocusSessions: 0
};
