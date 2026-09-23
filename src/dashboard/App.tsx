import React, { useState, useEffect } from 'react';
import { useAppData } from '../utils/useAppData';
import StatsTab from './components/StatsTab';
import SettingsTab from './components/SettingsTab';
import { BarChart2, Settings } from 'lucide-react';
import { KnightLogo } from '../components/KnightLogo';

type Tab = 'stats' | 'settings';

const App: React.FC = () => {
  const data = useAppData();
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'settings' || tab === 'stats') setActiveTab(tab);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans">

      {/* Ambient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-knight-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KnightLogo size={24} />
            <span className="text-base font-bold tracking-tight text-white/90">Knight Pomodoro</span>
          </div>

          <nav className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/8">
            {([
              ['stats', <BarChart2 size={15} />, 'Stats'],
              ['settings', <Settings size={15} />, 'Settings'],
            ] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium text-sm ${
                  activeTab === id
                    ? 'bg-gradient-to-br from-knight-accent to-yellow-600 text-white shadow-lg shadow-knight-accent/20'
                    : 'hover:bg-white/8 text-slate-400 hover:text-white'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 relative z-10">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'stats' && <StatsTab data={data} />}
          {activeTab === 'settings' && <SettingsTab data={data} />}
        </div>
      </main>

    </div>
  );
};

export default App;
