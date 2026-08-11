import React, { useState } from 'react';
import { useAppData } from '../utils/useAppData';
import DashboardTab from './components/DashboardTab';
import SettingsTab from './components/SettingsTab';
import HistoryTab from './components/HistoryTab';
import { LayoutDashboard, Settings, History } from 'lucide-react';
import { KnightLogo } from '../components/KnightLogo';

const App: React.FC = () => {
  const data = useAppData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  if (!data) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className={`min-h-screen ${data.settings.theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-knight-light dark:bg-knight-dark min-h-screen text-knight-text dark:text-knight-textDark font-sans">
        
        {/* Navbar */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KnightLogo size={28} />
              <h1 className="text-xl font-bold tracking-tight">Knight Pomodoro</h1>
            </div>
            
            <nav className="flex gap-1">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition ${activeTab === 'dashboard' ? 'bg-gray-100 dark:bg-gray-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400'}`}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition ${activeTab === 'history' ? 'bg-gray-100 dark:bg-gray-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400'}`}
              >
                <History size={18} />
                History
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition ${activeTab === 'settings' ? 'bg-gray-100 dark:bg-gray-800 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-500 dark:text-gray-400'}`}
              >
                <Settings size={18} />
                Settings
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {activeTab === 'dashboard' && <DashboardTab data={data} />}
          {activeTab === 'history' && <HistoryTab data={data} />}
          {activeTab === 'settings' && <SettingsTab data={data} />}
        </main>

      </div>
    </div>
  );
};

export default App;
