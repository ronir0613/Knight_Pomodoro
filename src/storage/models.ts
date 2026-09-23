// ─── Pomodoro state machine ───────────────────────────────────────────────────

export type PomodoroState = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  /** Current phase of the state machine. */
  currentState: PomodoroState;

  /**
   * Absolute timestamp (ms) when the current phase ends.
   * null when idle or paused — use remainingMs instead.
   * This is the single source of truth that survives service-worker kills:
   * remaining = endsAt - Date.now() even after the worker restarts.
   */
  endsAt: number | null;

  /**
   * Timestamp when the session was paused.
   * Remaining time when paused = endsAt_at_pause_moment - pausedAt.
   * null when running or idle.
   */
  pausedAt: number | null;

  /**
   * Authoritative remaining milliseconds when paused or idle.
   * Unused while running (compute from endsAt - Date.now() instead).
   */
  remainingMs: number;

  /** How long the current (or last) phase was configured for, in ms. */
  phaseDurationMs: number;

  /** Total completed focus sessions across all time (for session dots in UI). */
  sessionsCompleted: number;

  /**
   * Position within the current long-break cycle (0-based).
   * Increments on each completed focus session; resets after longBreak.
   */
  currentCycle: number;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

/**
 * Tracks the current browser-activity segment.
 * Written to storage; survives service-worker kills.
 */
export interface TrackingState {
  /** Whether the browser window is currently in the foreground. */
  windowFocused: boolean;

  /** Current idle API state. */
  idleState: 'active' | 'idle' | 'locked';

  /**
   * When the current trackable segment started.
   * null when no active segment (e.g. machine locked, browser unfocused).
   */
  segmentStartedAt: number | null;

  /**
   * What kind of segment is currently being accumulated.
   * 'focus'     = counting toward focusedTime (focus phase, running, not locked)
   * 'unfocused' = counting toward unfocusedTime (idle/break, active, foreground)
   * 'none'      = not accumulating (locked, idle machine, or browser unfocused)
   */
  segmentType: 'focus' | 'unfocused' | 'none';

  /** Last time we flushed accumulated seconds to dailyStats (ms timestamp). */
  lastFlushedAt: number | null;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface UserSettings {
  // Durations
  focusDuration: number;       // ms (default 25 min)
  shortBreakDuration: number;  // ms (default 5 min)
  longBreakDuration: number;   // ms (default 15 min)
  longBreakInterval: number;   // sessions before long break (default 4)

  // Automation
  autoStartBreaks: boolean;
  autoStartFocus: boolean;

  // Blocking
  /**
   * Domains blocked during non-strict focus sessions.
   * Matched with subdomain coverage: 'reddit.com' also blocks 'www.reddit.com'.
   */
  blocklist: string[];
  /**
   * Domains explicitly allowed during strict focus sessions.
   * Everything else is blocked when strictMode is on.
   */
  allowedDomains: string[];
  strictMode: boolean;

  // Notifications
  desktopNotifications: boolean;
  soundEnabled: boolean;
  soundChoice: 'bell' | 'chime' | 'forest';

  // Misc
  theme: 'light' | 'dark' | 'system';
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface DailyStats {
  date: string;             // 'YYYY-MM-DD'
  focusedTime: number;      // ms accumulated while focus phase was running
  unfocusedTime: number;    // ms accumulated while browser active + no focus session
  completedSessions: number;
}

// ─── App data root ────────────────────────────────────────────────────────────

export interface FloatingTimerUI {
  x: number;
  y: number;
  collapsed: boolean;
}

export interface AppData {
  settings: UserSettings;
  timerState: TimerState;
  trackingState: TrackingState;
  dailyStats: Record<string, DailyStats>;
  floatingTimerUI: FloatingTimerUI;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: UserSettings = {
  focusDuration: 25 * 60 * 1000,
  shortBreakDuration: 5 * 60 * 1000,
  longBreakDuration: 15 * 60 * 1000,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  blocklist: [],
  allowedDomains: [],
  strictMode: false,
  desktopNotifications: true,
  soundEnabled: true,
  soundChoice: 'bell',
  theme: 'system',
};

export const DEFAULT_TIMER_STATE: TimerState = {
  currentState: 'idle',
  endsAt: null,
  pausedAt: null,
  remainingMs: 25 * 60 * 1000,
  phaseDurationMs: 25 * 60 * 1000,
  sessionsCompleted: 0,
  currentCycle: 0,
};

export const DEFAULT_TRACKING_STATE: TrackingState = {
  windowFocused: false,
  idleState: 'active',
  segmentStartedAt: null,
  segmentType: 'none',
  lastFlushedAt: null,
};

export const DEFAULT_FLOATING_TIMER_UI: FloatingTimerUI = {
  x: -1,  // -1 = not yet positioned; content script will default to top-right
  y: -1,
  collapsed: true,
};
