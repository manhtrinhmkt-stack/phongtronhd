import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Home, 
  Zap, 
  TrendingUp,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Components
import Login from './components/Login';
import { PWAInstallButton } from './components/PWAInstallButton';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pages
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Utilities from './pages/Utilities';
import Finance from './pages/Finance';

type Page = 'dashboard' | 'rooms' | 'utilities' | 'finance';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'rooms', label: 'Danh mục phòng', icon: Home },
    { id: 'utilities', label: 'Điện & Nước', icon: Zap },
    { id: 'finance', label: 'Báo cáo tài chính', icon: TrendingUp },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-stone-50 select-none sm:select-auto">
      {/* Mobile Overlay for Sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Fixed Sidebar */}
      <aside 
        className={cn(
          "bg-stone-900 text-stone-400 w-64 h-screen shrink-0 flex flex-col justify-between z-50 fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-transform duration-200 lg:transition-none shadow-2xl lg:shadow-none",
          !isSidebarOpen ? "-translate-x-full lg:translate-x-0 lg:w-20" : "translate-x-0"
        )}
      >
        <div className="p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className={cn("flex items-center gap-3 overflow-hidden", !isSidebarOpen && "lg:hidden")}>
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/30">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-black text-xl tracking-tight whitespace-nowrap">Quản lý phòng trọ</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-stone-800 text-stone-400 hover:text-white rounded-xl lg:hidden active:bg-stone-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-2 px-3 sm:px-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id as Page);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl group transition-colors text-left",
                activePage === item.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30" 
                  : "hover:bg-stone-800 hover:text-stone-200"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", activePage === item.id ? "text-white" : "text-stone-400 group-hover:text-stone-200")} />
              <span className={cn("font-bold text-sm", !isSidebarOpen && "lg:opacity-0 lg:w-0 lg:hidden")}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-800/80 shrink-0">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-red-950/40 hover:text-red-400 text-stone-400 group transition-colors",
              !isSidebarOpen && "lg:justify-center"
            )}
          >
            <LogOut className="w-5 h-5 text-stone-400 group-hover:text-red-400 shrink-0" />
            <span className={cn("font-bold text-sm", !isSidebarOpen && "lg:hidden")}>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
        {/* Fixed Top Header */}
        <header className="h-14 sm:h-16 shrink-0 bg-white border-b border-stone-200 flex items-center justify-between px-3.5 sm:px-6 z-30 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-stone-100 rounded-xl text-stone-700 active:bg-stone-200"
              title="Menu"
            >
              <Menu className="w-5 h-5 text-stone-700" />
            </button>
            <h1 className="text-base sm:text-lg font-black text-stone-900 truncate max-w-[170px] sm:max-w-none tracking-tight">
              {navItems.find(i => i.id === activePage)?.label}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstallButton />
            <div className="text-right hidden sm:block">
              <p className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                {user.displayName || (user.email ? user.email.replace('@roommaster.local', '') : 'Quản trị viên')}
              </p>
              <p className="text-[11px] font-semibold text-stone-500">
                {user.email?.endsWith('@roommaster.local') 
                  ? `@${user.email.replace('@roommaster.local', '')}` 
                  : user.email}
              </p>
            </div>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || (user.email ? user.email.replace('@roommaster.local', '') : 'Admin'))}&background=10b981&color=fff`} 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-stone-200 object-cover shadow-2xs"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-24 lg:pb-6">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'rooms' && <Rooms />}
          {activePage === 'utilities' && <Utilities />}
          {activePage === 'finance' && <Finance />}
        </div>

        {/* Mobile Bottom Navigation Bar (lg:hidden) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id as Page)}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[64px]",
                  isActive ? "text-emerald-600 bg-emerald-50/80 font-black" : "text-stone-500 font-bold hover:text-stone-800"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110 text-emerald-600" : "text-stone-500")} />
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[72px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
