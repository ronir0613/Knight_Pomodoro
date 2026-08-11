import { useState, useEffect } from 'react';
import { AppData } from '../storage/models';
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
        setData(changes.knight_pomodoro_data.newValue as AppData);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  return data;
};
