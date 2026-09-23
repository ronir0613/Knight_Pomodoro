import {
  getAppData,
  getTodayDateString,
  incrementDailySession,
  incrementDailyTime,
  updateTimerState,
} from '../storage/storage';
import { PomodoroState, TimerState } from '../storage/models';
import { updateRules } from './blocker';
import { notify, playSound } from '../notifications/notifications';
import { onTimerStateChanged } from '../tracking/activity-tracker';

// ─── Alarm names ──────────────────────────────────────────────────────────────
export const ALARM_TIMER = 'kp-timer';
export const ALARM_BADGE = 'kp-badge';
export const ALARM_FLUSH = 'kp-flush';

// ─── Badge ────────────────────────────────────────────────────────────────────

const updateBadge = async (remainingMs: number, running: boolean): Promise<void> => {
  if (running && remainingMs > 0) {
    const mins = Math.max(1, Math.ceil(remainingMs / 60_000));
    await chrome.action.setBadgeText({ text: String(mins) });
    await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
};

// ─── Computed remaining ───────────────────────────────────────────────────────

export const getRemainingMs = (state: TimerState): number => {
  if (state.currentState === 'idle') return state.remainingMs;
  if (state.pausedAt !== null) return state.remainingMs; // set at pause time
  if (state.endsAt === null) return state.remainingMs;
  return Math.max(0, state.endsAt - Date.now());
};

// ─── Internal: schedule the timer alarm ──────────────────────────────────────

const scheduleTimerAlarm = (endsAt: number): void => {
  chrome.alarms.create(ALARM_TIMER, { when: endsAt });
};

// ─── Internal: transition to next phase ──────────────────────────────────────

/**
 * Core state machine transition. Called both by handleTimerAlarm (normal flow)
 * and by recoverFromWorkerKill (catch-up after worker death).
 */
export const advanceState = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;
  const now = Date.now();

  if (timerState.currentState === 'idle') return;

  if (timerState.currentState === 'focus') {
    // Focus session complete
    const newCycle = timerState.currentCycle + 1;
    const newSessions = timerState.sessionsCompleted + 1;
    const needsLong = newCycle >= settings.longBreakInterval;
    const nextPhase: PomodoroState = needsLong ? 'longBreak' : 'shortBreak';
    const nextDuration = needsLong ? settings.longBreakDuration : settings.shortBreakDuration;

    // Credit focus time for the completed phase to stats
    await incrementDailyTime(getTodayDateString(), timerState.phaseDurationMs, 0);
    await incrementDailySession(getTodayDateString());

    notify('focus-done', settings);
    playSound(settings);

    if (settings.autoStartBreaks) {
      const endsAt = now + nextDuration;
      const newState = await updateTimerState({
        currentState: nextPhase,
        endsAt,
        pausedAt: null,
        remainingMs: nextDuration,
        phaseDurationMs: nextDuration,
        sessionsCompleted: newSessions,
        currentCycle: needsLong ? 0 : newCycle,
      });
      scheduleTimerAlarm(endsAt);
      await updateRules(newState, settings);
      await onTimerStateChanged(newState);
    } else {
      // Pause at break start — user must explicitly start
      const newState = await updateTimerState({
        currentState: nextPhase,
        endsAt: null,
        pausedAt: now,
        remainingMs: nextDuration,
        phaseDurationMs: nextDuration,
        sessionsCompleted: newSessions,
        currentCycle: needsLong ? 0 : newCycle,
      });
      await updateRules(newState, settings);
      await onTimerStateChanged(newState);
    }

    await updateBadge(nextDuration, settings.autoStartBreaks);

  } else {
    // Short or long break complete
    const nextDuration = settings.focusDuration;
    notify('break-done', settings);
    playSound(settings);

    if (settings.autoStartFocus) {
      const endsAt = now + nextDuration;
      const newState = await updateTimerState({
        currentState: 'focus',
        endsAt,
        pausedAt: null,
        remainingMs: nextDuration,
        phaseDurationMs: nextDuration,
      });
      scheduleTimerAlarm(endsAt);
      await updateRules(newState, settings);
      await onTimerStateChanged(newState);
      await updateBadge(nextDuration, true);
    } else {
      const newState = await updateTimerState({
        currentState: 'idle',
        endsAt: null,
        pausedAt: null,
        remainingMs: nextDuration,
        phaseDurationMs: nextDuration,
      });
      await updateRules(newState, settings);
      await onTimerStateChanged(newState);
      await updateBadge(0, false);
    }
  }
};

// ─── Public: alarm handler ────────────────────────────────────────────────────

export const handleTimerAlarm = async (): Promise<void> => {
  await advanceState();
};

export const handleBadgeAlarm = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState } = data;
  if (timerState.currentState !== 'idle' && timerState.pausedAt === null) {
    await updateBadge(getRemainingMs(timerState), true);
  }
};

// ─── Public: user-initiated actions ──────────────────────────────────────────

export const startFocus = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  if (timerState.currentState !== 'idle') return;

  const duration = settings.focusDuration;
  const now = Date.now();
  const endsAt = now + duration;

  const newState = await updateTimerState({
    currentState: 'focus',
    endsAt,
    pausedAt: null,
    remainingMs: duration,
    phaseDurationMs: duration,
  });

  scheduleTimerAlarm(endsAt);
  chrome.alarms.create(ALARM_BADGE, { periodInMinutes: 1 });

  await updateRules(newState, settings);
  await onTimerStateChanged(newState);
  await updateBadge(duration, true);
};

/**
 * Start a break that was paused waiting for user (autoStartBreaks = false).
 */
export const startPausedBreak = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  if (
    (timerState.currentState !== 'shortBreak' && timerState.currentState !== 'longBreak') ||
    timerState.pausedAt === null
  ) return;

  const now = Date.now();
  const remaining = timerState.remainingMs;
  const endsAt = now + remaining;

  const newState = await updateTimerState({
    endsAt,
    pausedAt: null,
  });

  scheduleTimerAlarm(endsAt);
  await updateRules(newState, settings);
  await onTimerStateChanged(newState);
  await updateBadge(remaining, true);
};

export const pauseSession = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  // Strict mode: can't pause focus
  if (timerState.currentState === 'focus' && settings.strictMode) return;
  if (timerState.currentState === 'idle') return;
  if (timerState.pausedAt !== null) return;

  const now = Date.now();
  const remaining = getRemainingMs(timerState);

  await chrome.alarms.clear(ALARM_TIMER);

  const newState = await updateTimerState({
    pausedAt: now,
    endsAt: null,
    remainingMs: remaining,
  });

  await updateRules(newState, settings);
  await onTimerStateChanged(newState);
  await updateBadge(0, false);
};

export const resumeSession = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  if (timerState.currentState === 'idle') return;
  if (timerState.pausedAt === null) return;

  const now = Date.now();
  const endsAt = now + timerState.remainingMs;

  const newState = await updateTimerState({
    endsAt,
    pausedAt: null,
  });

  scheduleTimerAlarm(endsAt);
  await updateRules(newState, settings);
  await onTimerStateChanged(newState);
  await updateBadge(timerState.remainingMs, true);
};

export const stopSession = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  if (timerState.currentState === 'idle') return;

  await chrome.alarms.clear(ALARM_TIMER);

  const newState = await updateTimerState({
    currentState: 'idle',
    endsAt: null,
    pausedAt: null,
    remainingMs: settings.focusDuration,
    phaseDurationMs: settings.focusDuration,
  });

  await updateRules(newState, settings);
  await onTimerStateChanged(newState);
  await updateBadge(0, false);
};

export const skipCurrent = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, settings } = data;

  // Strict mode: can't skip focus
  if (timerState.currentState === 'focus' && settings.strictMode) return;
  if (timerState.currentState === 'idle') return;

  await chrome.alarms.clear(ALARM_TIMER);
  await advanceState();
};

// ─── Service-worker kill recovery ─────────────────────────────────────────────

/**
 * Called once on service-worker startup.
 * If endsAt has already passed (worker was killed while timer ran),
 * fire the transition that should have happened.
 */
export const recoverFromWorkerKill = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState } = data;

  if (timerState.currentState === 'idle') return;
  if (timerState.pausedAt !== null) return; // paused — no catch-up needed
  if (timerState.endsAt === null) return;

  const now = Date.now();

  if (timerState.endsAt <= now) {
    // The alarm should have fired while the worker was dead — fire the transition now
    console.log('[KP] Catching up missed transition after worker kill.');
    await handleTimerAlarm();
  } else {
    // Still time remaining — re-register the alarm (lost on worker kill)
    scheduleTimerAlarm(timerState.endsAt);
    await updateBadge(timerState.endsAt - now, true);
  }
};
