import { useState, useEffect } from 'react';
import { AppData, DEFAULT_SETTINGS, DEFAULT_TIMER_STATE } from '../storage/models';
import { getAppData } from '../storage/storage';

export const useAppData = () => {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const appData = await getAppData();
      setData(appData);
    };

    loadData();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.knight_pomodoro_data) {
        const raw = changes.knight_pomodoro_data.newValue as Partial<AppData> | undefined;
        // Mirror the same defensive merge that getAppData() does so new
        // settings fields added after install are never undefined.
        const merged: AppData = {
          settings: { ...DEFAULT_SETTINGS, ...raw?.settings },
          timerState: raw?.timerState ?? DEFAULT_TIMER_STATE,
          dailyStats: raw?.dailyStats ?? {},
          sessionHistory: raw?.sessionHistory ?? [],
        };
        setData(merged);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return data;
};
