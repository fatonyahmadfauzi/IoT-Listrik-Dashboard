import { Home, Settings, BarChart3, Clock, LogOut } from 'lucide-react';

type SidebarProps = {
  activePage: 'dashboard' | 'history' | 'analytics' | 'settings';
  onNavigate: (
    page: 'dashboard' | 'history' | 'analytics' | 'settings'
  ) => void;
};

import { useAuthStore } from '../lib/store';

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { role, isTempAccount, logout } = useAuthStore();

  const items: Array<{ key: any, label: string, icon: any }> = [
    { key: 'dashboard', label: 'Dashboard', icon: Home },
    { key: 'history', label: 'History', icon: Clock },
  ];

  if (role === 'admin' || isTempAccount) {
    items.push({ key: 'analytics', label: 'Analytics', icon: BarChart3 });
  }

  if (role === 'admin' && !isTempAccount) {
    items.push({ key: 'settings', label: 'Settings', icon: Settings });
  }

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          IoT Dashboard
        </h1>
      </div>
      <nav className="px-4 flex-1 overflow-y-auto">
        <ul className="sidebar-nav space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <li
                key={item.key}
                role="button"
                className={active ? 'active' : ''}
                onClick={() => onNavigate(item.key)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium cursor-pointer"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
}
