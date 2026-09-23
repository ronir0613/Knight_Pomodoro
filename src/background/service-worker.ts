import { handleAlarm, startTimer, pauseTimer, resumeTimer, stopTimer, skipPhase } from '../timer/timer-engine';
import { handleActivityStateChange, handleWindowFocusChange, handleTimerStateChangeForTracking } from '../tracking/activity-tracker';
import { getAppData } from '../storage/storage';
import { enableTabLock, disableTabLock, startTabListeners, stopTabListeners } from './tab-lock';

// Initialize idle detection and strict-mode tab lock on startup
chrome.storage.local.get('knight_pomodoro_data').then((result: any) => {
  const settings = result.knight_pomodoro_data?.settings;
  const threshold = settings?.idleThreshold || 300;
  chrome.idle.setDetectionInterval(threshold);

  // Restore tab-lock state if strict mode was active before the service worker was killed
  if (settings?.strictModeEnabled) {
    enableTabLock(settings.allowedDomains || []);
    startTabListeners(settings.allowedDomains || []);
  }
});

// Setup event listeners
chrome.alarms.onAlarm.addListener(async (alarm: any) => {
  await handleAlarm(alarm);
  await handleTimerStateChangeForTracking();
});

chrome.idle.onStateChanged.addListener((newState: any) => {
  handleActivityStateChange(newState);
});

chrome.windows.onFocusChanged.addListener((windowId: number) => {
  handleWindowFocusChange(windowId);
});

// Update idle interval and strict-mode tab lock if settings change
chrome.storage.onChanged.addListener((changes: any, namespace: string) => {
  if (namespace === 'local' && changes.knight_pomodoro_data) {
    const oldSettings = changes.knight_pomodoro_data.oldValue?.settings;
    const newSettings = changes.knight_pomodoro_data.newValue?.settings;

    if (newSettings?.idleThreshold && oldSettings?.idleThreshold !== newSettings.idleThreshold) {
      chrome.idle.setDetectionInterval(newSettings.idleThreshold);
    }

    // Sync tab-lock whenever strictMode or allowedDomains changes
    const strictChanged = oldSettings?.strictModeEnabled !== newSettings?.strictModeEnabled;
    const domainsChanged = JSON.stringify(oldSettings?.allowedDomains) !== JSON.stringify(newSettings?.allowedDomains);
    if (strictChanged || domainsChanged) {
      if (newSettings?.strictModeEnabled) {
        enableTabLock(newSettings.allowedDomains || []);
        startTabListeners(newSettings.allowedDomains || []);
      } else {
        disableTabLock();
        stopTabListeners();
      }
    }
  }
});

// Message listener for UI commands
chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  (async () => {
    switch (request.type) {
      case 'START_TIMER':
        await startTimer();
        await handleTimerStateChangeForTracking();
        break;
      case 'PAUSE_TIMER':
        await pauseTimer();
        break;
      case 'RESUME_TIMER':
        await resumeTimer();
        break;
      case 'STOP_TIMER':
        await stopTimer();
        await handleTimerStateChangeForTracking();
        break;
      case 'SKIP_PHASE':
        await skipPhase();
        await handleTimerStateChangeForTracking();
        break;
      case 'GET_STATE':
        const data = await getAppData();
        sendResponse(data);
        return; // sendResponse is called here
    }
    sendResponse({ success: true });
  })();
  
  return true; // Indicate async response
});

// Initial tracking start check
chrome.windows.getLastFocused((window: any) => {
  if (window && window.focused) {
    handleWindowFocusChange(window.id!);
  }
});
