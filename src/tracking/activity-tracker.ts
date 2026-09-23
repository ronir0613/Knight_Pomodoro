import { getAppData, updateDailyStats, getTodayDateString } from '../storage/storage';

const TRACKING_STATE_KEY = 'knight_pomodoro_tracking_state';

interface TrackingState {
  isTrackingUnfocused: boolean;
  unfocusedStartTime: number;
}

const getTrackingState = async (): Promise<TrackingState> => {
  const result = await chrome.storage.local.get(TRACKING_STATE_KEY);
  return (result[TRACKING_STATE_KEY] as TrackingState) || { isTrackingUnfocused: false, unfocusedStartTime: 0 };
};

const setTrackingState = async (state: TrackingState) => {
  await chrome.storage.local.set({ [TRACKING_STATE_KEY]: state });
};

export const startUnfocusedTracking = async () => {
  const data = await getAppData();
  const trackingState = await getTrackingState();
  
  if (data.timerState.phase === 'IDLE' && !trackingState.isTrackingUnfocused) {
    await setTrackingState({
      isTrackingUnfocused: true,
      unfocusedStartTime: Date.now()
    });
  }
};

export const stopUnfocusedTracking = async () => {
  const trackingState = await getTrackingState();
  if (trackingState.isTrackingUnfocused) {
    const duration = Date.now() - trackingState.unfocusedStartTime;
    if (duration > 0) {
      await updateDailyStats(getTodayDateString(), {
        unfocusedTime: duration
      });
    }
    await setTrackingState({
      isTrackingUnfocused: false,
      unfocusedStartTime: 0
    });
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
