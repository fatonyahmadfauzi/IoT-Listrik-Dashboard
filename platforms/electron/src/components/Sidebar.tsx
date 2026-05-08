import { Home, Settings, BarChart3, Clock, LogOut } from 'lucide-react';

type SidebarProps = {
  activePage: 'dashboard' | 'history' | 'analytics' | 'settings';
  onNavigate: (
    page: 'dashboard' | 'history' | 'analytics' | 'settings'
  ) => void;
};

import { useAuthStore } from '../lib/store';

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { user, role, isTempAccount, logout } = useAuthStore();
  const email = user?.email || 'akun belum dimuat';
  const displayName = user?.displayName || email.split('@')[0] || 'User';
  const initial = (displayName || email || 'U').trim().charAt(0).toUpperCase();
  const roleText = isTempAccount ? 'TEMP' : role === 'admin' ? 'ADMIN' : 'USER';

  const items: Array<{ key: any, label: string, icon: any }> = [
    { key: 'dashboard', label: 'Dashboard', icon: Home },
    { key: 'history', label: 'Riwayat Log', icon: Clock },
  ];

  if (role === 'admin' || isTempAccount) {
    items.push({ key: 'analytics', label: 'Analytics', icon: BarChart3 });
  }

  if (role === 'admin' && !isTempAccount) {
    items.push({ key: 'settings', label: 'Pengaturan', icon: Settings });
  }

  return (
    <aside className="w-64 bg-[#090d12] border-r border-slate-800/90 flex flex-col shadow-[18px_0_45px_rgba(0,0,0,0.22)]">
      <div className="p-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-sky-500/35 bg-sky-500/20 text-sky-200">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">
              IoT Listrik
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">Monitor System</p>
          </div>
        </div>
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
      <div className="space-y-3 border-t border-slate-800/90 p-4">
        <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-400/50 bg-gradient-to-br from-sky-500 to-blue-700 text-sm font-black text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-100">{displayName}</p>
              <p className="truncate text-xs text-slate-400">{email}</p>
            </div>
          </div>
          <span className="mt-3 inline-flex rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-amber-100">
            {roleText}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center w-full rounded-lg border border-slate-800 px-4 py-3 text-slate-400 transition-colors hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-200 font-semibold cursor-pointer"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
}
