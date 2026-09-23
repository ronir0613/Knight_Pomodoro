import {
  ALARM_BADGE,
  ALARM_FLUSH,
  ALARM_TIMER,
  handleBadgeAlarm,
  handleTimerAlarm,
  pauseSession,
  recoverFromWorkerKill,
  resumeSession,
  skipCurrent,
  startFocus,
  startPausedBreak,
  stopSession,
} from './state-machine';
import { handleFlushAlarm, handleIdleStateChange, handleWindowFocusChange, initTracking } from '../tracking/activity-tracker';
import { updateRules } from './blocker';
import { getAppData, getTodayDateString, incrementDailyTime } from '../storage/storage';

// ─── Startup ──────────────────────────────────────────────────────────────────

(async () => {
  const data = await getAppData();

  // Set idle detection interval (spec: 60s)
  chrome.idle.setDetectionInterval(60);

  // Ensure periodic alarms are registered (they survive worker kills, but create
  // is a no-op if the alarm already exists — safe to call unconditionally)
  chrome.alarms.create(ALARM_BADGE, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_FLUSH, { periodInMinutes: 0.5 }); // every 30 s

  // Re-apply blocking rules (may have been active before worker was killed)
  await updateRules(data.timerState, data.settings);

  // If the timer was running when the worker was killed, catch up
  await recoverFromWorkerKill();

  // Sync tracking state with current window/idle reality
  await initTracking();
})();

// ─── Alarms ───────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case ALARM_TIMER:
      await handleTimerAlarm();
      break;
    case ALARM_BADGE:
      await handleBadgeAlarm();
      break;
    case ALARM_FLUSH:
      await handleFlushAlarm();
      break;
  }
});

// ─── Tracking events ──────────────────────────────────────────────────────────

chrome.idle.onStateChanged.addListener((newState) => {
  handleIdleStateChange(newState as 'active' | 'idle' | 'locked');
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  handleWindowFocusChange(windowId);
});

// ─── Settings changes → re-apply blocking rules ───────────────────────────────

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== 'local') return;
  if (!changes.knight_pomodoro_data) return;

  const newData = changes.knight_pomodoro_data.newValue as import('../storage/models').AppData | undefined;
  if (!newData) return;

  // Re-apply rules whenever settings or timer state changes
  // (blocklist, strictMode, allowedDomains, or state transition)
  await updateRules(newData.timerState, newData.settings);
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle_timer': {
      const data = await getAppData();
      const { timerState } = data;
      if (timerState.currentState === 'idle') {
        await startFocus();
      } else if (timerState.pausedAt !== null) {
        await resumeSession();
      } else {
        await pauseSession();
      }
      break;
    }
    case 'skip_phase':
      await skipCurrent();
      break;
  }
});

// ─── Message handler (from popup + content script) ───────────────────────────

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    switch (request.type) {
      case 'START_FOCUS':
        await startFocus();
        break;
      case 'START_BREAK':
        await startPausedBreak();
        break;
      case 'PAUSE':
        await pauseSession();
        break;
      case 'RESUME':
        await resumeSession();
        break;
      case 'STOP':
        await stopSession();
        break;
      case 'SKIP':
        await skipCurrent();
        break;
      case 'GET_STATE': {
        const data = await getAppData();
        sendResponse(data);
        return;
      }
      // Blocked-page soft override: user waited 10s and is about to access the site.
      // Log it as unfocused browsing time (honest: it's a lapse, not a chosen break).
      case 'LOG_SOFT_OVERRIDE':
        await incrementDailyTime(getTodayDateString(), 0, 10_000);
        break;
    }
    sendResponse({ ok: true });
  })();
  return true; // keep channel open for async sendResponse
});
