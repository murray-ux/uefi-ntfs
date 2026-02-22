import { Link, useLocation } from 'react-router-dom';
import { Shield, Monitor, AlertTriangle, Pentagon, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

const navItems = [
  { path: '/', icon: Shield, label: 'Dashboard' },
  { path: '/devices', icon: Monitor, label: 'Devices' },
  { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { path: '/pentagon', icon: Pentagon, label: 'Pentagon' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-genesis-dark">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-genesis-darker border-b border-cyan-500/30 flex items-center justify-between px-4 z-50">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-cyan-400">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-cyan-400 font-orbitron text-lg">GENESIS 2.0</h1>
        <div className="w-6" />
      </header>

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-genesis-darker border-r border-cyan-500/30 z-40 transition-transform lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 border-b border-cyan-500/30">
          <h1 className="text-2xl font-orbitron font-bold text-cyan-400 tracking-wider">
            GENESIS
          </h1>
          <p className="text-xs text-cyan-600 font-mono mt-1">v2.0 SOVEREIGN</p>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-300'
                )}
              >
                <Icon size={20} />
                <span className="font-rajdhani font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <span className="text-cyan-400 font-bold">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.username || 'Admin'}</p>
              <p className="text-xs text-cyan-600">{user?.securityLevel || 'Maximum'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors w-full px-4 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
