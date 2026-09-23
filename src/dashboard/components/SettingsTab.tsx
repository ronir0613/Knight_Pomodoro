import React, { useState } from 'react';
import { AppData, UserSettings } from '../../storage/models';
import { updateSettings } from '../../storage/storage';
import { Clock, Zap, Lock, Palette, Database, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

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
            alert('Data imported successfully! Refreshing...');
            window.location.reload();
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Failed to parse backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleClear = async () => {
    if (confirm('⚠️ This will permanently delete ALL your data, including statistics and history. This cannot be undone. Are you absolutely sure?')) {
      await chrome.storage.local.clear();
      alert('All data has been cleared.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Save Button Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
            Settings
          </h2>
          <p className="text-slate-500 text-sm">Customize your Pomodoro experience</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg ${
            isSaved
              ? 'bg-green-500 text-white shadow-green-500/30'
              : 'bg-gradient-to-r from-knight-accent to-yellow-600 text-white hover:shadow-knight-accent/50 hover:scale-105'
          }`}
        >
          {isSaved ? (
            <>
              <CheckCircle2 size={20} />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Timer Settings */}
      <section className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/20 rounded-xl">
              <Clock size={22} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Timer Durations</h3>
              <p className="text-sm text-slate-400 mt-0.5">Set your ideal focus and break intervals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Focus Duration (min)
              </label>
              <input
                type="number"
                min="1"
                value={settings.focusDuration / 60000}
                onChange={(e) => handleChange('focusDuration', parseInt(e.target.value) * 60000)}
                className="w-full border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Short Break (min)
              </label>
              <input
                type="number"
                min="1"
                value={settings.shortBreakDuration / 60000}
                onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value) * 60000)}
                className="w-full border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Long Break (min)
              </label>
              <input
                type="number"
                min="1"
                value={settings.longBreakDuration / 60000}
                onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value) * 60000)}
                className="w-full border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm"
              />
            </div>
          </div>
        </div>

        {/* Behavior Settings */}
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/20 rounded-xl">
              <Zap size={22} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Behavior</h3>
              <p className="text-sm text-slate-400 mt-0.5">Automate your workflow</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
                className="w-5 h-5 rounded-md text-knight-accent focus:ring-2 focus:ring-knight-accent focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-medium text-white group-hover:text-knight-accent transition-colors">Auto-start Breaks</span>
                <p className="text-xs text-slate-500 mt-0.5">Breaks begin automatically after focus sessions</p>
              </div>
            </label>

            <label className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.autoStartFocus}
                onChange={(e) => handleChange('autoStartFocus', e.target.checked)}
                className="w-5 h-5 rounded-md text-knight-accent focus:ring-2 focus:ring-knight-accent focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-medium text-white group-hover:text-knight-accent transition-colors">Auto-start Focus</span>
                <p className="text-xs text-slate-500 mt-0.5">Focus sessions begin automatically after breaks</p>
              </div>
            </label>

            <div className="pt-4">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Long Break Interval</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  value={settings.longBreakInterval}
                  onChange={(e) => handleChange('longBreakInterval', parseInt(e.target.value))}
                  className="w-32 border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm"
                />
                <span className="text-sm text-slate-400">sessions until long break</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strict Mode */}
        <div className="p-8 border-b border-white/10 bg-gradient-to-br from-red-950/20 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-red-500/20 rounded-xl">
              <Lock size={22} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Strict Mode & Site Blocking
                <Shield size={16} className="text-red-400" />
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">Block distracting websites during focus sessions</p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.strictModeEnabled}
                onChange={(e) => handleChange('strictModeEnabled', e.target.checked)}
                className="w-5 h-5 rounded-md text-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-white group-hover:text-red-400 transition-colors">Enable Strict Mode</span>
                <p className="text-xs text-slate-400 mt-1">When enabled, all non-allowlisted sites will be blocked during focus</p>
              </div>
            </label>

            {settings.strictModeEnabled && (
              <div className="pl-6 space-y-6 border-l-2 border-red-500/30 ml-2.5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-yellow-500" />
                    Allowed Domains
                  </label>
                  <p className="text-xs text-slate-500 mb-4">Add domains that should remain accessible (e.g., github.com, *.docs.google.com)</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {settings.allowedDomains.map(domain => (
                      <span
                        key={domain}
                        className="bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-white/10 hover:border-red-500/50 transition-all group/tag"
                      >
                        <span className="text-white">{domain}</span>
                        <button
                          onClick={() => handleChange('allowedDomains', settings.allowedDomains.filter(d => d !== domain))}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Type domain and press Enter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim().toLowerCase();
                        if (val && !settings.allowedDomains.includes(val)) {
                          handleChange('allowedDomains', [...settings.allowedDomains, val]);
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                    className="w-full border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Escape Friction (seconds)</label>
                  <p className="text-xs text-slate-500 mb-4">How long to hold Stop/Skip buttons to break out of strict mode</p>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      value={settings.strictLockDelaySeconds}
                      onChange={(e) => handleChange('strictLockDelaySeconds', parseInt(e.target.value) || 0)}
                      className="w-32 border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm"
                    />
                    <span className="text-sm text-slate-400">Set to 0 to disable hold requirement</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-pink-500/20 rounded-xl">
              <Palette size={22} className="text-pink-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Appearance & Tracking</h3>
              <p className="text-sm text-slate-400 mt-0.5">Customize how Knight Pomodoro looks and tracks</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value as UserSettings['theme'])}
                className="w-full sm:w-64 border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm cursor-pointer"
              >
                <option value="light" className="bg-slate-800">Light</option>
                <option value="dark" className="bg-slate-800">Dark</option>
                <option value="system" className="bg-slate-800">System Default</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Idle Detection Threshold</label>
              <p className="text-xs text-slate-500 mb-4">Seconds of inactivity before pausing the timer</p>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="60"
                  value={settings.idleThreshold}
                  onChange={(e) => handleChange('idleThreshold', parseInt(e.target.value))}
                  className="w-32 border border-white/20 rounded-xl px-4 py-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all backdrop-blur-sm"
                />
                <span className="text-sm text-slate-400">seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="p-8 bg-gradient-to-br from-red-950/10 to-transparent">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-red-500/20 rounded-xl">
              <Database size={22} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-400">Data Management</h3>
              <p className="text-sm text-slate-400 mt-0.5">Export, import, or clear your data</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExport}
              className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 font-medium transition-all duration-200 backdrop-blur-sm hover:border-knight-accent/50 text-white hover:shadow-lg"
            >
              Export Data
            </button>
            <label className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 font-medium transition-all duration-200 cursor-pointer backdrop-blur-sm hover:border-knight-accent/50 text-white hover:shadow-lg">
              Import Data
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50 font-medium transition-all duration-200 ml-auto hover:shadow-lg hover:shadow-red-500/20"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsTab;
