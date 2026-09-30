import React, { useState, useEffect } from 'react';
import { useAppData } from '../utils/useAppData';
import StatsTab from './components/StatsTab';
import SettingsTab from './components/SettingsTab';
import { BarChart2, Settings } from 'lucide-react';
import { KnightLogo } from '../components/KnightLogo';
import './dashboard.css';

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
    <div className="kp-dashboard min-h-screen flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <div className="kp-dashboard min-h-screen text-slate-100 font-sans">
      <header className="kp-dashboard-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KnightLogo size={24} />
            <span className="text-base font-bold tracking-tight text-white/90">Knight Pomodoro</span>
          </div>

          <nav className="kp-dashboard-nav" aria-label="Dashboard sections">
            {([
              ['stats', <BarChart2 size={15} />, 'Stats'],
              ['settings', <Settings size={15} />, 'Settings'],
            ] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                className={`kp-dashboard-tab ${activeTab === id ? 'is-active' : ''}`}
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
