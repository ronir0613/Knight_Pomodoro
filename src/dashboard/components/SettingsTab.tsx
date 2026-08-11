import React, { useState } from 'react';
import { AppData, UserSettings } from '../../storage/models';
import { updateSettings } from '../../storage/storage';

interface Props {
  data: AppData;
}

const SettingsTab: React.FC<Props> = ({ data }) => {
  const [settings, setSettings] = useState<UserSettings>(data.settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    await updateSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knight-pomodoro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.settings && imported.timerState) {
            await chrome.storage.local.set({ knight_pomodoro_data: imported });
            alert('Data imported successfully!');
            window.location.reload();
          } else {
            alert('Invalid backup file.');
          }
        } catch (err) {
          alert('Failed to parse file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) {
      await chrome.storage.local.clear();
      alert('Data cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <button 
          onClick={handleSave}
          className="bg-knight-accent hover:bg-yellow-600 text-white px-6 py-2 rounded-md font-medium transition"
        >
          {isSaved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        
        {/* Timer Settings */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Timer Durations (minutes)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Focus</label>
              <input 
                type="number" 
                min="1"
                value={settings.focusDuration / 60000} 
                onChange={(e) => handleChange('focusDuration', parseInt(e.target.value) * 60000)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-knight-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Short Break</label>
              <input 
                type="number" 
                min="1"
                value={settings.shortBreakDuration / 60000} 
                onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value) * 60000)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-knight-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Long Break</label>
              <input 
                type="number" 
                min="1"
                value={settings.longBreakDuration / 60000} 
                onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value) * 60000)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-knight-accent"
              />
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="text-lg font-semibold mb-4">Behavior</h3>
          <label className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={settings.autoStartBreaks}
              onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
              className="w-4 h-4 text-knight-accent rounded focus:ring-knight-accent"
            />
            <span>Auto-start Breaks</span>
          </label>
          <label className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={settings.autoStartFocus}
              onChange={(e) => handleChange('autoStartFocus', e.target.checked)}
              className="w-4 h-4 text-knight-accent rounded focus:ring-knight-accent"
            />
            <span>Auto-start Focus</span>
          </label>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 mt-4">Long break interval (sessions)</label>
            <input 
              type="number" 
              min="1"
              value={settings.longBreakInterval} 
              onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value))}
              className="w-full sm:w-32 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-knight-accent"
            />
          </div>
        </div>

        {/* Tracking & Appearance */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Tracking & Appearance</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Theme</label>
              <select 
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value as UserSettings['theme'])}
                className="w-full sm:w-48 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-knight-accent"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Idle Threshold (seconds away from computer)</label>
              <input 
                type="number" 
                min="60"
                value={settings.idleThreshold} 
                onChange={(e) => handleChange('idleThreshold', parseInt(e.target.value))}
                className="w-full sm:w-32 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-knight-accent"
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Data Management</h3>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleExport}
              className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 px-4 py-2 rounded-md font-medium transition"
            >
              Export Data
            </button>
            <label className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 px-4 py-2 rounded-md font-medium transition cursor-pointer">
              Import Data
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button 
              onClick={handleClear}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900 dark:hover:bg-red-900/40 px-4 py-2 rounded-md font-medium transition ml-auto"
            >
              Clear All Data
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default SettingsTab;
