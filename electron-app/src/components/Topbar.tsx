import { Bell, Moon, Sun } from 'lucide-react';
import { useStore } from '../store';

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  const { theme, toggleTheme } = useStore();

  const handleNotification = () => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(
        'Test Notification',
        'This is a test notification from the app!'
      );
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="flex items-center space-x-4">
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
