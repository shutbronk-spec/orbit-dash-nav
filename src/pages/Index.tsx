import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, Layers, Download, Wrench, BookOpen, 
  ChevronDown, PlusCircle, Activity, Menu, Bell, 
  ChevronRight, LogOut, User, Monitor 
} from 'lucide-react';
import SingleConfig from '@/components/SingleConfig';
import BatchConfig from '@/components/BatchConfig';
import TicketPage from '@/components/TicketPage';
import PnpExport from '@/components/PnpExport';
import GuidePage from '@/components/GuidePage';
import LoginPage from '@/pages/LoginPage';
import { getSession, clearSession } from '@/hooks/useSession';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Route = 'single-config' | 'batch-config' | 'create-ticket' | 'monitoring-crm' | 'pnp-export' | 'tools' | 'guide';

interface NavItemProps {
  id: Route;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: (id: Route) => void;
  hasSubItems?: boolean;
  isExpanded?: boolean;
}

const EASING: [number, number, number, number] = [0.4, 0, 0.2, 1];

const ROUTE_META: Record<Route, { title: string; icon: React.ElementType; description: string }> = {
  'single-config': { title: 'Single Configuration', icon: Settings, description: 'Configure individual network parameters with precision and control.' },
  'batch-config': { title: 'Batch Configuration', icon: Layers, description: 'Manage bulk configuration changes across multiple devices simultaneously.' },
  'create-ticket': { title: 'Create Ticket', icon: PlusCircle, description: 'Submit a new support or configuration request ticket.' },
  'monitoring-crm': { title: 'Monitoring CRM', icon: Activity, description: 'Real-time monitoring dashboard for customer relationship management.' },
  'pnp-export': { title: 'PnP Export Data', icon: Download, description: 'Export Plug and Play configuration data for deployment.' },
  'tools': { title: 'Utility Tools', icon: Wrench, description: 'Access diagnostic and utility tools for network management.' },
  'guide': { title: 'Documentation & Guide', icon: BookOpen, description: 'Comprehensive documentation and getting started guides.' },
};

// --- Nav Components ---
const NavItem: React.FC<NavItemProps> = ({ id, icon: Icon, label, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`group flex items-center w-full px-4 py-2.5 my-0.5 text-sm font-medium transition-all duration-150
      ${active 
        ? 'bg-sidebar-active/10 text-sidebar-active border-l-[3px] border-sidebar-active' 
        : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-primary-foreground border-l-[3px] border-transparent'
      }`}
  >
    <Icon className={`w-4 h-4 mr-3 transition-colors ${active ? 'text-sidebar-active' : 'group-hover:text-primary-foreground'}`} />
    <span className="flex-1 text-left">{label}</span>
  </button>
);

// --- Main App ---
const Index: React.FC = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeRoute, setActiveRoute] = useState<Route>('single-config');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Session check on load + interval
  useEffect(() => {
    const checkSession = () => {
      const session = getSession();
      setAuthenticated(!!session);
    };
    checkSession();
    const interval = setInterval(checkSession, 30000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const route = (e as CustomEvent).detail as Route;
      setActiveRoute(route);
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  const handleNavClick = useCallback((id: Route) => {
    setActiveRoute(id);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const handleLogout = useCallback(() => {
    clearSession();
    setAuthenticated(false);
  }, []);

  const handleLogin = useCallback(() => {
    setAuthenticated(true);
  }, []);

  // Loading state
  if (authenticated === null) return null;

  // Show login
  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const meta = ROUTE_META[activeRoute];
  const PageIcon = meta.icon;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-foreground/60 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar text-sidebar-foreground flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 ${!sidebarOpen ? 'md:-translate-x-full md:hidden' : ''}`}
      >
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-primary/20">
            <Monitor className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-primary-foreground">
            NetConfig <span className="text-sidebar-active">Pro</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <NavItem id="single-config" icon={Settings} label="Single Config" active={activeRoute === 'single-config'} onClick={handleNavClick} />
          <NavItem id="batch-config" icon={Layers} label="Batch Config" active={activeRoute === 'batch-config'} onClick={handleNavClick} />
          <NavItem id="create-ticket" icon={PlusCircle} label="Create Ticket" active={activeRoute === 'create-ticket'} onClick={handleNavClick} />
          <NavItem id="monitoring-crm" icon={Activity} label="Monitoring CRM" active={activeRoute === 'monitoring-crm'} onClick={handleNavClick} />
          <NavItem id="pnp-export" icon={Download} label="PnP Export" active={activeRoute === 'pnp-export'} onClick={handleNavClick} />
          <NavItem id="tools" icon={Wrench} label="Tools" active={activeRoute === 'tools'} onClick={handleNavClick} />
          <NavItem id="guide" icon={BookOpen} label="Guide" active={activeRoute === 'guide'} onClick={handleNavClick} />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border bg-foreground/5">
          <div className="flex items-center p-2 rounded-xl hover:bg-sidebar-hover transition-colors cursor-pointer group"
            onClick={handleLogout}
            title="Logout"
          >
            <div className="w-9 h-9 rounded-full bg-muted-foreground/30 flex items-center justify-center mr-3 border border-sidebar-border overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-foreground truncate">
                {getSession()?.username || 'User'}
              </p>
              <p className="text-xs text-sidebar-muted truncate">Network Admin</p>
            </div>
            <LogOut className="w-4 h-4 text-sidebar-muted group-hover:text-destructive transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <header className="h-16 bg-card border-b border-topbar-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="hidden sm:flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Dashboard</span>
              <ChevronRight className="w-3 h-3 mx-2" />
              <span className="text-foreground">{meta.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
            </button>
            <div className="h-8 w-px bg-border mx-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 pl-1 pr-3 py-1 hover:bg-muted rounded-full transition-colors"
              title="Logout"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="hidden sm:inline text-xs font-medium text-muted-foreground">Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            <motion.div
              key={activeRoute}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASING }}
            >
              {activeRoute === 'single-config' ? (
                <SingleConfig />
              ) : activeRoute === 'batch-config' ? (
                <BatchConfig />
              ) : activeRoute === 'create-ticket' ? (
                <TicketPage initialPage="create" />
              ) : activeRoute === 'monitoring-crm' ? (
                <TicketPage initialPage="monitoring" />
              ) : activeRoute === 'pnp-export' ? (
                <PnpExport />
              ) : activeRoute === 'guide' ? (
                <GuidePage />
              ) : (
                <div className="bg-card rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="p-8 md:p-12 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mb-6 border border-border">
                      <PageIcon className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">{meta.title}</h1>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">{meta.description}</p>
                    <div className="w-full space-y-4">
                      <div className="h-4 bg-muted rounded-full w-3/4 mx-auto animate-pulse" />
                      <div className="h-4 bg-muted rounded-full w-1/2 mx-auto animate-pulse" />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-24 bg-muted rounded-xl border border-dashed border-border flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Module {i}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="mt-12 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all shadow-md shadow-primary/20 active:scale-95">
                      Initialize Module
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
