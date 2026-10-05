import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  FileText, 
  Zap, 
  Settings, 
  TrendingUp,
  LogOut,
  Menu,
  X,
  Plus,
  Search,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Components
import Login from './components/Login';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pages
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import Contracts from './pages/Contracts';
import Utilities from './pages/Utilities';
import Finance from './pages/Finance';

type Page = 'dashboard' | 'rooms' | 'tenants' | 'contracts' | 'utilities' | 'finance';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'rooms', label: 'Danh mục phòng', icon: Home },
    { id: 'tenants', label: 'Khách thuê', icon: Users },
    { id: 'contracts', label: 'Hợp đồng', icon: FileText },
    { id: 'utilities', label: 'Điện & Nước', icon: Zap },
    { id: 'finance', label: 'Báo cáo tài chính', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-stone-900 text-stone-400 w-64 fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
          !isSidebarOpen ? "-translate-x-full lg:translate-x-0 lg:w-20" : "translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className={cn("flex items-center gap-3 overflow-hidden", !isSidebarOpen && "lg:hidden")}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl whitespace-nowrap">RoomMaster</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-stone-800 rounded-md lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id as Page);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                activePage === item.id 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" 
                  : "hover:bg-stone-800 hover:text-stone-200"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", activePage === item.id ? "text-white" : "text-stone-500 group-hover:text-stone-300")} />
              <span className={cn("font-medium transition-opacity", !isSidebarOpen && "lg:opacity-0 lg:w-0")}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-all group",
              !isSidebarOpen && "lg:justify-center"
            )}
          >
            <LogOut className="w-5 h-5 text-stone-500 group-hover:text-red-400" />
            <span className={cn("font-medium", !isSidebarOpen && "lg:hidden")}>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-stone-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold text-stone-900 truncate max-w-[150px] sm:max-w-none">
              {navItems.find(i => i.id === activePage)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-stone-900">
                {user.displayName || (user.email ? user.email.replace('@roommaster.local', '') : 'Quản trị viên')}
              </p>
              <p className="text-xs text-stone-500">
                {user.email?.endsWith('@roommaster.local') 
                  ? `@${user.email.replace('@roommaster.local', '')}` 
                  : user.email}
              </p>
            </div>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || (user.email ? user.email.replace('@roommaster.local', '') : 'Admin'))}&background=10b981&color=fff`} 
              className="w-10 h-10 rounded-full border border-stone-200 object-cover"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activePage === 'dashboard' && <Dashboard />}
              {activePage === 'rooms' && <Rooms />}
              {activePage === 'tenants' && <Tenants />}
              {activePage === 'contracts' && <Contracts />}
              {activePage === 'utilities' && <Utilities />}
              {activePage === 'finance' && <Finance />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
