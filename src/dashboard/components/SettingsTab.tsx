import React, { useState } from 'react';
import { AppData, UserSettings } from '../../storage/models';
import { exportAppData, resetStats, updateSettings } from '../../storage/storage';
import {
  Clock, Zap, Shield, Bell, Database, CheckCircle2, Plus, X,
} from 'lucide-react';

interface Props { data: AppData; }

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}> = ({ icon, title, description, children, danger }) => (
  <section className={`bg-gradient-to-br backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden ${
    danger
      ? 'from-red-950/20 to-white/5 border-red-500/15'
      : 'from-white/10 to-white/5 border-white/10'
  }`}>
    <div className={`p-6 border-b ${danger ? 'border-red-500/10' : 'border-white/8'}`}>
      <div className="flex items-center gap-3 mb-1">
        {icon}
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </section>
);

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <label className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
    <div
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-10 h-6 rounded-full border-2 transition-all duration-200 cursor-pointer mt-0.5 ${
        checked ? 'bg-knight-accent border-knight-accent' : 'bg-white/8 border-white/15'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`} />
    </div>
    <div>
      <div className="font-medium text-white group-hover:text-knight-accent transition-colors text-sm">{label}</div>
      {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
    </div>
  </label>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min = 1, max, unit, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v) && v >= min) onChange(v);
        }}
        className="w-28 border border-white/15 rounded-xl px-3 py-2.5 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all"
      />
      {unit && <span className="text-sm text-slate-500">{unit}</span>}
    </div>
  </div>
);

const SettingsTab: React.FC<Props> = ({ data }) => {
  const [settings, setSettings] = useState<UserSettings>(data.settings);
  const [saved, setSaved] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addToList = (listKey: 'blocklist' | 'allowedDomains', value: string) => {
    const v = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!v) return;
    const current = settings[listKey] as string[];
    if (!current.includes(v)) set(listKey, [...current, v]);
    setNewDomain('');
  };

  const removeFromList = (listKey: 'blocklist' | 'allowedDomains', domain: string) => {
    set(listKey, (settings[listKey] as string[]).filter((d) => d !== domain));
  };

  const addCurrentTab = (listKey: 'blocklist' | 'allowedDomains') => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) return;
      try {
        const hostname = new URL(url).hostname;
        const current = settings[listKey] as string[];
        if (hostname && !current.includes(hostname)) {
          set(listKey, [...current, hostname]);
        }
      } catch { /* invalid URL */ }
    });
  };

  const handleResetStats = async () => {
    if (confirm('Clear all stats and session history? Settings are preserved.')) {
      await resetStats();
      alert('Stats cleared.');
      window.location.reload();
    }
  };

  const handleExport = async () => {
    const json = await exportAppData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knight-pomodoro-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (imported.settings && imported.timerState) {
          await chrome.storage.local.set({ knight_pomodoro_data: imported });
          alert('Imported successfully — reloading.');
          window.location.reload();
        } else {
          alert('Invalid backup file.');
        }
      } catch {
        alert('Could not parse the file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    if (confirm('⚠️ Delete ALL data including settings? This cannot be undone.')) {
      await chrome.storage.local.clear();
      alert('All data cleared.');
      window.location.reload();
    }
  };

  const DomainList: React.FC<{
    listKey: 'blocklist' | 'allowedDomains';
    placeholder: string;
    chipColor: string;
  }> = ({ listKey, placeholder, chipColor }) => {
    const domains = settings[listKey] as string[];
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-3 min-h-8">
          {domains.map((d) => (
            <span
              key={d}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${chipColor}`}
            >
              {d}
              <button
                onClick={() => removeFromList(listKey, d)}
                className="hover:text-red-400 transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {domains.length === 0 && (
            <span className="text-xs text-slate-600 italic">No domains added</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={placeholder}
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addToList(listKey, newDomain); }}
            className="flex-1 border border-white/15 rounded-xl px-3 py-2 bg-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all"
          />
          <button
            onClick={() => addToList(listKey, newDomain)}
            className="px-3 py-2 rounded-xl bg-white/8 border border-white/12 hover:bg-white/15 text-slate-300 transition-all"
            title="Add domain"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => addCurrentTab(listKey)}
            className="px-3 py-2 rounded-xl bg-white/8 border border-white/12 hover:bg-white/15 text-slate-300 text-xs font-medium transition-all whitespace-nowrap"
            title="Add current tab's domain"
          >
            + current tab
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-1">
            Settings
          </h2>
          <p className="text-slate-500 text-sm">Changes apply after saving</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg text-sm ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-knight-accent to-yellow-600 text-white hover:shadow-knight-accent/40 hover:scale-105'
          }`}
        >
          {saved ? <><CheckCircle2 size={16} /> Saved!</> : 'Save Changes'}
        </button>
      </div>

      {/* Durations */}
      <Section
        icon={<div className="p-2 bg-blue-500/15 rounded-xl"><Clock size={18} className="text-blue-400" /></div>}
        title="Durations"
        description="Focus and break lengths"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberInput
            label="Focus"
            value={settings.focusDuration / 60_000}
            onChange={(v) => set('focusDuration', v * 60_000)}
            unit="min"
          />
          <NumberInput
            label="Short Break"
            value={settings.shortBreakDuration / 60_000}
            onChange={(v) => set('shortBreakDuration', v * 60_000)}
            unit="min"
          />
          <NumberInput
            label="Long Break"
            value={settings.longBreakDuration / 60_000}
            onChange={(v) => set('longBreakDuration', v * 60_000)}
            unit="min"
          />
          <NumberInput
            label="Sessions → long break"
            value={settings.longBreakInterval}
            min={1}
            max={10}
            onChange={(v) => set('longBreakInterval', v)}
            unit="sessions"
          />
        </div>
      </Section>

      {/* Automation */}
      <Section
        icon={<div className="p-2 bg-purple-500/15 rounded-xl"><Zap size={18} className="text-purple-400" /></div>}
        title="Automation"
        description="Auto-start behaviour"
      >
        <Toggle
          label="Auto-start breaks"
          description="Breaks begin automatically when a focus session ends"
          checked={settings.autoStartBreaks}
          onChange={(v) => set('autoStartBreaks', v)}
        />
        <Toggle
          label="Auto-start focus"
          description="Next focus session starts automatically after a break"
          checked={settings.autoStartFocus}
          onChange={(v) => set('autoStartFocus', v)}
        />
      </Section>

      {/* Blocking */}
      <Section
        icon={<div className="p-2 bg-red-500/15 rounded-xl"><Shield size={18} className="text-red-400" /></div>}
        title="Blocking"
        description="Site blocking during focus sessions"
      >
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Blocklist</label>
          <p className="text-xs text-slate-600 mb-3">
            Sites blocked during focus (subdomains included). Unblocked automatically on breaks, pauses, and session end.
          </p>
          <DomainList
            listKey="blocklist"
            placeholder="e.g. reddit.com"
            chipColor="bg-red-500/10 text-red-300 border-red-500/20 hover:border-red-500/40"
          />
        </div>

        <div className="pt-2 border-t border-white/8">
          <Toggle
            label="Strict mode"
            description="Block everything except allowed domains below. Blocklist and skip are also locked during focus."
            checked={settings.strictMode}
            onChange={(v) => set('strictMode', v)}
          />
          {settings.strictMode && (
            <div className="mt-4 pl-4 border-l-2 border-red-500/30">
              <label className="block text-sm font-medium text-slate-300 mb-1">Allowed domains</label>
              <p className="text-xs text-slate-600 mb-3">
                Sites that remain accessible in strict mode (everything else is blocked).
              </p>
              <DomainList
                listKey="allowedDomains"
                placeholder="e.g. github.com"
                chipColor="bg-green-500/10 text-green-300 border-green-500/20 hover:border-green-500/40"
              />
            </div>
          )}
        </div>
      </Section>

      {/* Notifications */}
      <Section
        icon={<div className="p-2 bg-amber-500/15 rounded-xl"><Bell size={18} className="text-amber-400" /></div>}
        title="Notifications"
        description="Alerts when sessions end"
      >
        <Toggle
          label="Desktop notifications"
          description="Show a notification when focus or break ends"
          checked={settings.desktopNotifications}
          onChange={(v) => set('desktopNotifications', v)}
        />
        <Toggle
          label="Sound"
          description="Play a chime on session transitions"
          checked={settings.soundEnabled}
          onChange={(v) => set('soundEnabled', v)}
        />
        {settings.soundEnabled && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sound</label>
            <select
              value={settings.soundChoice}
              onChange={(e) => set('soundChoice', e.target.value as UserSettings['soundChoice'])}
              className="w-48 border border-white/15 rounded-xl px-3 py-2.5 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all cursor-pointer"
            >
              <option value="bell" className="bg-slate-900">Bell</option>
              <option value="chime" className="bg-slate-900">Chime</option>
              <option value="forest" className="bg-slate-900">Forest</option>
            </select>
          </div>
        )}
      </Section>

      {/* Data */}
      <Section
        icon={<div className="p-2 bg-red-500/15 rounded-xl"><Database size={18} className="text-red-400" /></div>}
        title="Data"
        description="Export, import, or clear your data"
        danger
      >
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/8 text-sm font-medium text-white transition-all"
          >
            Export backup
          </button>
          <label className="px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/8 text-sm font-medium text-white transition-all cursor-pointer">
            Import backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={handleResetStats}
            className="px-5 py-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 text-sm font-medium transition-all"
          >
            Reset stats
          </button>
          <button
            onClick={handleClearAll}
            className="px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-sm font-medium transition-all ml-auto"
          >
            Clear all data
          </button>
        </div>
        <p className="text-xs text-slate-600">
          "Reset stats" clears session history and daily stats only — settings are preserved.<br/>
          "Clear all data" removes everything including settings.
        </p>
      </Section>
    </div>
  );
};

export default SettingsTab;
