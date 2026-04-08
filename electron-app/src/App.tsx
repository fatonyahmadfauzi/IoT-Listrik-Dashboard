import { useEffect, useState } from 'react';
import { useStore } from './store';
import { useAuthStore, useDataStore } from './lib/store';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { Login } from './components/Login';

type Page = 'dashboard' | 'history' | 'analytics' | 'settings';

function App() {
  const { theme } = useStore();
  const { user, loading, initAuth, logout } = useAuthStore();
  const { subscribeToData, subscribeLogs, subscribeSettings, subscribeUsers } = useDataStore();

  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Initialize Firebase auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Subscribe to data when user is logged in
  useEffect(() => {
    if (user) {
      subscribeToData();
      subscribeLogs();
      subscribeSettings();
      subscribeUsers();
    }
  }, [user, subscribeToData, subscribeLogs, subscribeSettings, subscribeUsers]);

  const renderPage = () => {
    switch (page) {
      case 'history':
        return <History />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings onLogout={logout} />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col">
        <Topbar
          title={
            page === 'history'
              ? 'History'
              : page === 'analytics'
              ? 'Analytics'
              : page === 'settings'
              ? 'Settings'
              : 'Dashboard'
          }
        />
        <main className="flex-1 p-6 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
