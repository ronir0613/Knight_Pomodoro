import { getAppData, updateDailyStats, getTodayDateString } from '../storage/storage';

// In-memory state for tracking
let isTrackingUnfocused = false;
let unfocusedStartTime = 0;

export const startUnfocusedTracking = async () => {
  const data = await getAppData();
  if (data.timerState.phase === 'IDLE' && !isTrackingUnfocused) {
    isTrackingUnfocused = true;
    unfocusedStartTime = Date.now();
  }
};

export const stopUnfocusedTracking = async () => {
  if (isTrackingUnfocused) {
    const duration = Date.now() - unfocusedStartTime;
    if (duration > 0) {
      await updateDailyStats(getTodayDateString(), {
        unfocusedTime: duration
      });
    }
    isTrackingUnfocused = false;
  }
};

export const handleActivityStateChange = async (newState: any) => {
  if (newState === 'active') {
    // Check if Chrome has focus
    chrome.windows.getLastFocused((window: any) => {
      if (window && window.focused) {
        startUnfocusedTracking();
      }
    });
  } else {
    // idle or locked
    stopUnfocusedTracking();
  }
};

export const handleWindowFocusChange = async (windowId: number) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Lost focus
    stopUnfocusedTracking();
  } else {
    // Gained focus
    const state = await chrome.idle.queryState(15); // Query if active
    if (state === 'active') {
      startUnfocusedTracking();
    }
  }
};

export const handleTimerStateChangeForTracking = async () => {
  const data = await getAppData();
  if (data.timerState.phase !== 'IDLE') {
    // Timer started, stop unfocused tracking
    stopUnfocusedTracking();
  } else {
    // Timer ended, check if we should start tracking
    const state = await chrome.idle.queryState(15);
    if (state === 'active') {
      chrome.windows.getLastFocused((window: any) => {
        if (window && window.focused) {
          startUnfocusedTracking();
        }
      });
    }
  }
};
