import {
  getAppData,
  getTodayDateString,
  incrementDailyTime,
  updateTrackingState,
} from '../storage/storage';
import { TimerState, TrackingState } from '../storage/models';

// ─── Determine what kind of segment should be active ─────────────────────────

function computeSegmentType(
  timerState: TimerState,
  tracking: TrackingState
): TrackingState['segmentType'] {
  // Machine locked or browser unfocused → count nothing
  if (tracking.idleState === 'locked') return 'none';
  if (!tracking.windowFocused) return 'none';

  // Focus running (not paused): accumulate focused time
  if (
    timerState.currentState === 'focus' &&
    timerState.pausedAt === null &&
    tracking.idleState === 'active'
  ) {
    return 'focus';
  }

  // Idle state, active machine, foreground browser → unfocused browsing
  if (
    (timerState.currentState === 'idle' ||
      timerState.currentState === 'shortBreak' ||
      timerState.currentState === 'longBreak') &&
    tracking.idleState === 'active'
  ) {
    return 'unfocused';
  }

  return 'none';
}

// ─── Flush accumulated time to dailyStats ────────────────────────────────────

/**
 * Flush accumulated ms since lastFlushedAt into dailyStats.
 * Called every 30 s by the kp-flush alarm, and on every segment boundary.
 */
const flushSegment = async (): Promise<void> => {
  const data = await getAppData();
  const { trackingState } = data;

  if (trackingState.segmentType === 'none' || trackingState.segmentStartedAt === null) {
    return;
  }

  const now = Date.now();
  const since = trackingState.lastFlushedAt ?? trackingState.segmentStartedAt;
  const elapsedMs = now - since;

  if (elapsedMs <= 0) return;

  const today = getTodayDateString();

  if (trackingState.segmentType === 'focus') {
    await incrementDailyTime(today, elapsedMs, 0);
  } else {
    await incrementDailyTime(today, 0, elapsedMs);
  }

  await updateTrackingState({ lastFlushedAt: now });
};

// ─── Recompute and apply the correct segment ──────────────────────────────────

const resync = async (): Promise<void> => {
  const data = await getAppData();
  const { timerState, trackingState } = data;

  const desired = computeSegmentType(timerState, trackingState);
  const current = trackingState.segmentType;

  if (desired === current) {
    // Same segment type — nothing to change, flush will happen on the periodic alarm
    return;
  }

  // Segment boundary: flush what we've accumulated in the old segment
  await flushSegment();

  // Start the new segment
  const now = Date.now();
  await updateTrackingState({
    segmentType: desired,
    segmentStartedAt: desired === 'none' ? null : now,
    lastFlushedAt: desired === 'none' ? null : now,
  });
};

// ─── Event handlers (called from service-worker.ts) ──────────────────────────

/**
 * Called when chrome.idle.onStateChanged fires.
 */
export const handleIdleStateChange = async (
  newState: 'active' | 'idle' | 'locked'
): Promise<void> => {
  await updateTrackingState({ idleState: newState });
  await resync();
};

/**
 * Called when chrome.windows.onFocusChanged fires.
 */
export const handleWindowFocusChange = async (windowId: number): Promise<void> => {
  const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
  await updateTrackingState({ windowFocused: focused });
  await resync();
};

/**
 * Called after every timer state transition so tracking stays in sync.
 */
export const onTimerStateChanged = async (_newTimerState: TimerState): Promise<void> => {
  // The storage was already written by state-machine.ts; resync reads it fresh.
  // We need to force the timerState we just wrote into the decision, but
  // getAppData() will return it since storage was already updated before we're called.
  await resync();
};

/**
 * Called every 30 s by the kp-flush alarm.
 * Just flush — no segment boundary change.
 */
export const handleFlushAlarm = async (): Promise<void> => {
  await flushSegment();
};

/**
 * Called once at service-worker startup to initialize window focus state.
 */
export const initTracking = async (): Promise<void> => {
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  const anyFocused = windows.some((w) => w.focused);
  const idleState = await chrome.idle.queryState(60);

  await updateTrackingState({
    windowFocused: anyFocused,
    idleState: idleState as TrackingState['idleState'],
  });

  await resync();
};
