import { useState, useEffect } from 'react';
import { AppData } from '../storage/models';
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

      // Re-read through the same migration and validation path used on mount.
      void getAppData().then(setData);
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return data;
};
