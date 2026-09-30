import React, { useState, useEffect } from 'react';
import { AppData, UserSettings } from '../../storage/models';
import { exportAppData, resetStats, updateSettings } from '../../storage/storage';
import {
  Clock, Zap, Shield, Bell, Database, CheckCircle2, Plus, X, Play,
} from 'lucide-react';

// ─── Feature flag ─────────────────────────────────────────────────────────────
// Flip to `true` once blocking has been fully verified working.
const BLOCKING_ENABLED = false;

interface Props { data: AppData; }

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
  badge?: string;
  disabled?: boolean;
}> = ({ icon, title, description, children, danger, badge, disabled }) => (
  <section className={`kp-settings-section overflow-hidden ${
    danger
      ? 'from-red-950/20 to-white/5 border-red-500/15'
      : 'from-white/10 to-white/5 border-white/10'
  } ${disabled ? 'opacity-50 pointer-events-none select-none' : ''}`}>
    <div className={`kp-setting-section-head p-5 border-b ${danger ? 'border-red-500/10' : 'border-white/8'}`}>
      <div className="flex items-center gap-3 mb-1">
        {icon}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {badge}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </section>
);

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, description, checked, onChange, disabled }) => (
  <div className={`flex items-start gap-4 p-3 rounded-xl transition-colors group ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/5'}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 w-10 h-6 rounded-full border-2 transition-all duration-200 mt-0.5 disabled:cursor-not-allowed ${checked ? 'bg-knight-accent border-knight-accent' : 'bg-white/8 border-white/15'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`} />
    </button>
    <div>
      <div className="font-medium text-white group-hover:text-knight-accent transition-colors text-sm">{label}</div>
      {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
    </div>
  </div>
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

// ─── DomainList ───────────────────────────────────────────────────────────────
// Defined at module scope (not inside SettingsTab) so React never remounts it.
// Each instance gets its own local input state via useState inside this component.

const DomainList: React.FC<{
  listKey: 'blocklist' | 'allowedDomains';
  domains: string[];
  placeholder: string;
  chipColor: string;
  onAdd: (listKey: 'blocklist' | 'allowedDomains', value: string) => void;
  onRemove: (listKey: 'blocklist' | 'allowedDomains', domain: string) => void;
  onAddCurrentTab: (listKey: 'blocklist' | 'allowedDomains') => void;
  currentTabDisabled: boolean;
  currentTabTooltip: string;
  disabled?: boolean;
}> = ({ listKey, domains, placeholder, chipColor, onAdd, onRemove, onAddCurrentTab, currentTabDisabled, currentTabTooltip, disabled }) => {
  // Bug 2 & 3 fix: each DomainList has its own independent local input state.
  // Only committed to storage on submit (Enter / click +).
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    onAdd(listKey, inputValue);
    setInputValue('');
  };

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
              onClick={() => onRemove(listKey, d)}
              className="hover:text-red-400 transition-colors"
              disabled={disabled}
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
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          disabled={disabled}
          className="flex-1 border border-white/15 rounded-xl px-3 py-2 bg-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-knight-accent focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="px-3 py-2 rounded-xl bg-white/8 border border-white/12 hover:bg-white/15 text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add domain"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => onAddCurrentTab(listKey)}
          disabled={disabled || currentTabDisabled}
          className="px-3 py-2 rounded-xl bg-white/8 border border-white/12 hover:bg-white/15 text-slate-300 text-xs font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          title={currentTabTooltip}
        >
          + current tab
        </button>
      </div>
    </div>
  );
};

// ─── SettingsTab ───────────────────────────────────────────────────────────────

const SettingsTab: React.FC<Props> = ({ data }) => {
  const [settings, setSettings] = useState<UserSettings>(data.settings);
  const [saved, setSaved] = useState(false);
  const [soundPreviewError, setSoundPreviewError] = useState(false);

  // Bug 1 fix: Track the last non-extension tab hostname.
  // The background service-worker tracks tab activations; we also track here
  // by listening to chrome.tabs events from the dashboard context.
  const [lastNonExtTabHostname, setLastNonExtTabHostname] = useState<string | null>(null);

  useEffect(() => {
    // Seed: query all tabs and find the most recently active non-extension tab
    const seedLastTab = () => {
      chrome.tabs.query({}, (tabs) => {
        // Filter to non-extension tabs that have valid http(s) URLs
        const candidates = tabs.filter((t) => {
          if (!t.url) return false;
          try {
            const u = new URL(t.url);
            return u.protocol === 'http:' || u.protocol === 'https:';
          } catch { return false; }
        });
        // Pick the last accessed one
        if (candidates.length > 0) {
          candidates.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
          try {
            const hostname = new URL(candidates[0].url!).hostname;
            if (hostname) setLastNonExtTabHostname(hostname);
          } catch { /* ignore */ }
        }
      });
    };

    seedLastTab();

    // Listen for tab activation changes
    const onActivated = (activeInfo: chrome.tabs.OnActivatedInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError || !tab?.url) return;
        try {
          const u = new URL(tab.url);
          if (u.protocol === 'http:' || u.protocol === 'https:') {
            setLastNonExtTabHostname(u.hostname);
          }
        } catch { /* ignore */ }
      });
    };

    // Listen for tab URL changes (e.g. navigation within same tab)
    const onUpdated = (tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo) => {
      if (changeInfo.url) {
        try {
          const u = new URL(changeInfo.url as string);
          if (u.protocol === 'http:' || u.protocol === 'https:') {
            // Only update if this tab is the active tab
            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
              if (activeTabs[0]?.id === tabId) {
                setLastNonExtTabHostname(u.hostname);
              }
            });
          }
        } catch { /* ignore */ }
      }
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated as any);

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated as any);
    };
  }, []);

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
  };

  const removeFromList = (listKey: 'blocklist' | 'allowedDomains', domain: string) => {
    set(listKey, (settings[listKey] as string[]).filter((d) => d !== domain));
  };

  // Bug 1 fix: use the tracked last-non-extension hostname instead of querying
  // the live active tab (which is always the settings page itself).
  const addCurrentTab = (listKey: 'blocklist' | 'allowedDomains') => {
    if (!lastNonExtTabHostname) return;
    const current = settings[listKey] as string[];
    if (!current.includes(lastNonExtTabHostname)) {
      set(listKey, [...current, lastNonExtTabHostname]);
    }
  };

  const currentTabDisabled = !lastNonExtTabHostname;
  const currentTabTooltip = lastNonExtTabHostname
    ? `Add ${lastNonExtTabHostname}`
    : 'No non-extension tab visited yet';

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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
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

      {/* Blocking — disabled behind BLOCKING_ENABLED flag */}
      <Section
        icon={<div className="p-2 bg-red-500/15 rounded-xl"><Shield size={18} className="text-red-400" /></div>}
        title="Blocking"
        description="Site blocking during focus sessions"
        badge={!BLOCKING_ENABLED ? 'Coming Soon' : undefined}
        disabled={!BLOCKING_ENABLED}
      >
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Blocklist</label>
          <p className="text-xs text-slate-600 mb-3">
            Sites blocked during focus (subdomains included). Unblocked automatically on breaks, pauses, and session end.
          </p>
          <DomainList
            listKey="blocklist"
            domains={settings.blocklist}
            placeholder="e.g. reddit.com"
            chipColor="bg-red-500/10 text-red-300 border-red-500/20 hover:border-red-500/40"
            onAdd={addToList}
            onRemove={removeFromList}
            onAddCurrentTab={addCurrentTab}
            currentTabDisabled={currentTabDisabled}
            currentTabTooltip={currentTabTooltip}
            disabled={!BLOCKING_ENABLED}
          />
        </div>

        <div className="pt-2 border-t border-white/8">
          <Toggle
            label="Strict mode"
            description="Block everything except allowed domains below. Blocklist and skip are also locked during focus."
            checked={settings.strictMode}
            onChange={(v) => set('strictMode', v)}
            disabled={!BLOCKING_ENABLED}
          />
          {settings.strictMode && (
            <div className="mt-4 pl-4 border-l-2 border-red-500/30">
              <label className="block text-sm font-medium text-slate-300 mb-1">Allowed domains</label>
              <p className="text-xs text-slate-600 mb-3">
                Sites that remain accessible in strict mode (everything else is blocked).
              </p>
              <DomainList
                listKey="allowedDomains"
                domains={settings.allowedDomains}
                placeholder="e.g. github.com"
                chipColor="bg-green-500/10 text-green-300 border-green-500/20 hover:border-green-500/40"
                onAdd={addToList}
                onRemove={removeFromList}
                onAddCurrentTab={addCurrentTab}
                currentTabDisabled={currentTabDisabled}
                currentTabTooltip={currentTabTooltip}
                disabled={!BLOCKING_ENABLED}
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
          description="Play a sound when a focus session or break ends"
          checked={settings.soundEnabled}
          onChange={(v) => set('soundEnabled', v)}
        />
        {settings.soundEnabled && (
          <div className="flex flex-wrap items-end gap-3">
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
            <button
              type="button"
              onClick={async () => {
                setSoundPreviewError(false);
                try {
                  const response = await chrome.runtime.sendMessage({ type: 'PREVIEW_SOUND', sound: settings.soundChoice });
                  if (!response?.ok) throw new Error(response?.error || 'Preview failed');
                } catch {
                  setSoundPreviewError(true);
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/8 text-sm font-medium text-white transition-all inline-flex items-center gap-2"
            >
              <Play size={14} fill="currentColor" /> Preview
            </button>
            {soundPreviewError && <p className="w-full text-xs text-red-300" role="status">Could not play the preview. Try again after reopening the extension.</p>}
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
