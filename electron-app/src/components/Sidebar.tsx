import { Home, Settings, BarChart3, Clock } from 'lucide-react';

type SidebarProps = {
  activePage: 'dashboard' | 'history' | 'analytics' | 'settings';
  onNavigate: (page: 'dashboard' | 'history' | 'analytics' | 'settings') => void;
};

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: Home },
    { key: 'history', label: 'History', icon: Clock },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          IoT Dashboard
        </h1>
      </div>
      <nav className="px-4">
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={`flex items-center w-full px-4 py-2 rounded-lg text-left transition ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
