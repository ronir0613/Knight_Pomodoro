import React, { useState, useEffect } from 'react';
import { useAppData } from '../utils/useAppData';
import DashboardTab from './components/DashboardTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';
import { LayoutDashboard, Settings, History, Sparkles } from 'lucide-react';
import { KnightLogo } from '../components/KnightLogo';

const App: React.FC = () => {
  const data = useAppData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'settings' || tab === 'history' || tab === 'dashboard') {
      setActiveTab(tab);
    }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-knight-accent mx-auto mb-6"></div>
          <p className="text-slate-400 text-lg">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${data.settings.theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen text-slate-100 font-sans">

        {/* Animated background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-knight-accent/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Header */}
        <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50 shadow-xl">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <KnightLogo size={32} />
                <Sparkles size={14} className="absolute -top-1 -right-1 text-knight-accent animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  Knight Pomodoro
                </h1>
                <p className="text-xs text-slate-500 tracking-wide">Focus. Achieve. Conquer.</p>
              </div>
            </div>

            <nav className="flex gap-2 bg-white/5 rounded-xl p-1.5 backdrop-blur-sm border border-white/10">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-5 py-2.5 rounded-lg flex items-center gap-2.5 transition-all duration-200 font-medium text-sm
                  ${activeTab === 'dashboard'
                    ? 'bg-gradient-to-br from-knight-accent to-yellow-600 text-white shadow-lg shadow-knight-accent/25'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-5 py-2.5 rounded-lg flex items-center gap-2.5 transition-all duration-200 font-medium text-sm
                  ${activeTab === 'history'
                    ? 'bg-gradient-to-br from-knight-accent to-yellow-600 text-white shadow-lg shadow-knight-accent/25'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
              >
                <History size={18} />
                History
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-5 py-2.5 rounded-lg flex items-center gap-2.5 transition-all duration-200 font-medium text-sm
                  ${activeTab === 'settings'
                    ? 'bg-gradient-to-br from-knight-accent to-yellow-600 text-white shadow-lg shadow-knight-accent/25'
                    : 'hover:bg-white/10 text-slate-400 hover:text-white'}`}
              >
                <Settings size={18} />
                Settings
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'dashboard' && <DashboardTab data={data} />}
            {activeTab === 'history' && <HistoryTab data={data} />}
            {activeTab === 'settings' && <SettingsTab data={data} />}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-slate-950/50 backdrop-blur-xl mt-20">
          <div className="max-w-6xl mx-auto px-6 py-6 text-center text-slate-500 text-sm">
            <p>Built with focus. Powered by discipline.</p>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default App;
