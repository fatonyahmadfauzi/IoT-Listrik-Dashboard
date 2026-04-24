import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { useAuthStore, useDataStore } from './lib/store';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { playAlarm, showNotification, stopAlarm } from './lib/notifikasi';
import { db } from './lib/firebase';
import { onValue, ref } from 'firebase/database';

type Page = 'dashboard' | 'history' | 'analytics' | 'settings';

function App() {
  const { theme, notifications } = useStore();
  const { user, role, loading, initAuth, logout, isTempAccount } = useAuthStore();
  const {
    currentData,
    subscribeToData,
    subscribeLogs,
    subscribeSettings,
    subscribeUsers,
    unsubscribeAll,
  } =
    useDataStore();

  const [page, setPage] = useState<Page>('dashboard');
  const prevStatus = useRef<string | undefined>(undefined);
  const prevResetAt = useRef<string | number | null | undefined>(undefined);
  const prevSystemEventId = useRef<string | undefined>(undefined);

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
      // Avoid duplicate listeners when role/user changes.
      unsubscribeAll();

      subscribeToData();
      subscribeLogs();

      // settings/users are admin-protected by RTDB rules.
      if (role === 'admin') {
        subscribeSettings();
        subscribeUsers();
      }
    } else {
      unsubscribeAll();
    }
  }, [
    user,
    role,
    subscribeToData,
    subscribeLogs,
    subscribeSettings,
    subscribeUsers,
    unsubscribeAll,
  ]);

  // Global alarm + notification (tetap bunyi walau pindah tab)
  useEffect(() => {
    // Saat logout / belum login, pastikan alarm mati
    if (!user) {
      stopAlarm();
      prevStatus.current = undefined;
      return;
    }

    const status = currentData?.status;

    if (!notifications || !status) {
      stopAlarm();
      prevStatus.current = status;
      return;
    }

    const danger = (s: string) =>
      s === 'WARNING' || s === 'LEAKAGE' || s === 'DANGER';
    const isDanger = danger(status);
    const wasDanger = prevStatus.current != null && danger(prevStatus.current);

    if (isDanger && prevStatus.current !== status) {
      showNotification('Peringatan Listrik', `Status: ${status}`);
      playAlarm();
    } else if (!isDanger && wasDanger) {
      stopAlarm();
    }

    prevStatus.current = status;
  }, [user, currentData?.status, notifications]);

  useEffect(() => {
    if (!user) {
      prevResetAt.current = undefined;
      return;
    }

    const resetAt = currentData?.reset_at;
    const resetByAdmin = currentData?.reset_by_admin;
    if (!resetByAdmin || !resetAt) {
      if (resetAt) prevResetAt.current = resetAt;
      return;
    }

    if (prevResetAt.current == null) {
      prevResetAt.current = resetAt;
      return;
    }

    if (prevResetAt.current !== resetAt) {
      showNotification(
        'Data sensor dikosongkan',
        currentData?.reset_note || 'Admin mengosongkan data realtime sensor perangkat IoT.'
      );
      prevResetAt.current = resetAt;
      return;
    }

    prevResetAt.current = resetAt;
  }, [user, currentData?.reset_at, currentData?.reset_by_admin, currentData?.reset_note]);

  useEffect(() => {
    if (!user || isTempAccount) {
      prevSystemEventId.current = undefined;
      return;
    }

    const unsub = onValue(ref(db, 'notifications/system/latest'), (snapshot) => {
      const payload = snapshot.val();
      if (!payload) return;
      if ((payload.target && payload.target !== 'physical') || (payload.scope && payload.scope !== 'physical')) {
        return;
      }

      const eventId = String(payload.id || '').trim();
      if (!eventId) return;

      if (prevSystemEventId.current == null) {
        prevSystemEventId.current = eventId;
        const createdAt = Number(payload.created_at || Date.parse(String(payload.created_at_iso || '')) || 0);
        if (!createdAt || Math.max(0, Date.now() - createdAt) > 15000) {
          return;
        }
      }

      if (prevSystemEventId.current === eventId) return;
      prevSystemEventId.current = eventId;

      const title = String(payload.title || 'Pembaruan Sistem').trim();
      const message = String(payload.message || '').trim();
      if (!message) return;
      showNotification(title, message);
    });

    return () => unsub();
  }, [user, isTempAccount]);

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
