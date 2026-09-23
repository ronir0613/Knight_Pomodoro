import { TimerState } from '../storage/models';

/**
 * Format milliseconds as MM:SS.
 */
export const formatTime = (ms: number): string => {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Compute the true remaining milliseconds from storage state.
 * While running: endsAt - Date.now()
 * While paused / idle: remainingMs (authoritative)
 */
export const getRemainingMs = (state: TimerState): number => {
  if (state.currentState === 'idle') return state.remainingMs;
  if (state.pausedAt !== null) return state.remainingMs;
  if (state.endsAt === null) return state.remainingMs;
  return Math.max(0, state.endsAt - Date.now());
};

/**
 * Progress 0–1 through the current phase.
 */
export const getPhaseProgress = (state: TimerState): number => {
  if (state.phaseDurationMs <= 0) return 0;
  const remaining = getRemainingMs(state);
  return Math.min(1, Math.max(0, 1 - remaining / state.phaseDurationMs));
};
