import { useState, useEffect } from 'react';
import {
  AppData,
  DEFAULT_FLOATING_TIMER_UI,
  DEFAULT_SETTINGS,
  DEFAULT_TIMER_STATE,
  DEFAULT_TRACKING_STATE,
} from '../storage/models';
import { getAppData } from '../storage/storage';

export const useAppData = () => {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    getAppData().then(setData);

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      namespace: string
    ) => {
      if (namespace !== 'local') return;
      if (!changes.knight_pomodoro_data) return;

      const raw = changes.knight_pomodoro_data.newValue as Partial<AppData> | undefined;
      // Mirror the same defensive merge that getAppData() does
      const merged: AppData = {
        settings: { ...DEFAULT_SETTINGS, ...raw?.settings },
        timerState: raw?.timerState ?? DEFAULT_TIMER_STATE,
        trackingState: { ...DEFAULT_TRACKING_STATE, ...raw?.trackingState },
        dailyStats: raw?.dailyStats ?? {},
        floatingTimerUI: { ...DEFAULT_FLOATING_TIMER_UI, ...raw?.floatingTimerUI },
      };
      setData(merged);
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return data;
};
