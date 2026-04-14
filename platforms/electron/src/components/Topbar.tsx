import { Bell, Moon, Sun } from 'lucide-react';
import { useStore } from '../store';
import { useAuthStore } from '../lib/store';

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useStore();
  const { role, isTempAccount, loading } = useAuthStore();

  const handleNotification = () => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(
        'Test Notification',
        'This is a test notification from the app!'
      );
    }
  };

  const roleText = loading
    ? 'Memuat...'
    : isTempAccount
    ? 'Temp Session'
    : role === 'admin'
    ? 'Admin'
    : 'User';

  return (
    <header className="h-16 bg-white dark:bg-gray-800 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          <span className="text-gray-600 dark:text-gray-300 font-medium capitalize">{roleText}</span>
        </div>
        <button
          onClick={handleNotification}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}
