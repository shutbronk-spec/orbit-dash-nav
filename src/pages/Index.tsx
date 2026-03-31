import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Settings, Layers, Download, Wrench, BookOpen, 
  ChevronDown, PlusCircle, Activity, Menu, Bell, 
  ChevronRight, LogOut, User, Monitor, Sun, Moon, Sword, Droplets
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

// --- Water Breathing Particle ---
const WaterParticle: React.FC<{ delay: number; x: number; size: number; duration: number }> = ({ delay, x, size, duration }) => (
  <motion.div
    className="absolute pointer-events-none rounded-full"
    style={{
      left: `${x}%`,
      bottom: '-5%',
      width: size,
      height: size,
      background: 'radial-gradient(circle, hsl(200 80% 65% / 0.35), hsl(200 80% 65% / 0.05))',
      filter: 'blur(0.5px)',
    }}
    animate={{
      y: [0, -(200 + Math.random() * 300)],
      x: [0, (Math.random() - 0.5) * 40],
      opacity: [0, 0.6, 0.3, 0],
      scale: [0.3, 1, 0.5],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      repeatDelay: 1 + Math.random() * 2,
      ease: 'easeOut',
    }}
  />
);

// --- Breathing Glow Orb ---
const BreathingOrb: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    className={`absolute pointer-events-none rounded-full ${className}`}
    style={{
      background: 'radial-gradient(circle, hsl(200 80% 55% / 0.12), transparent 70%)',
    }}
    animate={{
      scale: [1, 1.3, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
  />
);

// --- Nav Item ---
const NavItem: React.FC<NavItemProps> = ({ id, icon: Icon, label, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`group relative flex items-center w-full px-4 py-2.5 my-0.5 text-sm font-medium transition-all duration-200 overflow-hidden
      ${active 
        ? 'bg-sidebar-active/15 text-sidebar-active border-l-[3px] border-sidebar-active' 
        : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-primary-foreground border-l-[3px] border-transparent'
      }`}
  >
    {/* Shiny sweep on hover */}
    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
      style={{ background: 'linear-gradient(90deg, transparent, hsl(200 80% 60% / 0.15), transparent)' }}
    />
    {active && (
      <motion.span
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, hsl(200 80% 50% / 0.1), transparent)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    )}
    <Icon className={`w-4 h-4 mr-3 transition-all duration-200 ${active ? 'text-sidebar-active drop-shadow-[0_0_6px_hsl(200_80%_60%/0.6)]' : 'group-hover:text-primary-foreground group-hover:drop-shadow-[0_0_4px_hsl(200_80%_60%/0.3)]'}`} />
    <span className="flex-1 text-left relative z-10">{label}</span>
    {active && (
      <motion.div
        className="w-1.5 h-1.5 rounded-full mr-1"
        style={{ background: 'hsl(200 80% 60%)' }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    )}
  </button>
);

// --- Main App ---
const Index: React.FC = () => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [activeRoute, setActiveRoute] = useState<Route>('single-config');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Generate particles data once
  const particles = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      delay: Math.random() * 6,
      x: 5 + Math.random() * 90,
      size: 3 + Math.random() * 6,
      duration: 4 + Math.random() * 5,
    })), []
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const checkSession = () => {
      const session = getSession();
      setAuthenticated(!!session);
    };
    checkSession();
    const interval = setInterval(checkSession, 30000);
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

  if (authenticated === null) return null;
  if (!authenticated) return <LoginPage onLogin={handleLogin} />;

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
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 ${!sidebarOpen ? 'md:-translate-x-full md:hidden' : ''}`}
      >
        {/* Floating water particles */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {particles.map((p, i) => (
            <WaterParticle key={i} {...p} />
          ))}
          {/* Breathing orbs */}
          <BreathingOrb className="w-32 h-32 -bottom-10 -left-10" />
          <BreathingOrb className="w-24 h-24 top-1/3 -right-8" />
        </div>

        {/* Sidebar subtle water gradient overlay */}
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: 'linear-gradient(180deg, hsl(200 60% 20% / 0.08) 0%, transparent 30%, hsl(200 60% 30% / 0.05) 100%)',
          }}
        />

        {/* Header */}
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border relative z-10">
          <motion.div
            className="w-9 h-9 rounded-lg flex items-center justify-center mr-3 relative"
            style={{
              background: 'linear-gradient(135deg, hsl(200 80% 45%), hsl(210 90% 55%))',
              boxShadow: '0 0 14px hsl(200 80% 50% / 0.35)',
            }}
            animate={{
              boxShadow: [
                '0 0 10px hsl(200 80% 50% / 0.25)',
                '0 0 20px hsl(200 80% 50% / 0.45)',
                '0 0 10px hsl(200 80% 50% / 0.25)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Droplets className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-primary-foreground relative z-10">
              いしに<span className="text-sidebar-active" style={{ textShadow: '0 0 10px hsl(200 80% 50% / 0.5)' }}>たたかう</span>
            </span>
            <span className="text-[10px] font-medium" style={{ color: 'hsl(200 60% 55% / 0.6)', letterSpacing: '0.12em' }}>
              水の呼吸 • WATER BREATHING
            </span>
          </div>
        </div>

        {/* Nav section label */}
        <div className="px-5 pt-4 pb-1 relative z-10">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'hsl(200 50% 55% / 0.5)' }}>
            メニュー — Menu
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1 overflow-y-auto relative z-10">
          <NavItem id="single-config" icon={Settings} label="Single Config" active={activeRoute === 'single-config'} onClick={handleNavClick} />
          <NavItem id="batch-config" icon={Layers} label="Batch Config" active={activeRoute === 'batch-config'} onClick={handleNavClick} />
          <NavItem id="create-ticket" icon={PlusCircle} label="Create Ticket" active={activeRoute === 'create-ticket'} onClick={handleNavClick} />
          <NavItem id="monitoring-crm" icon={Activity} label="Monitoring CRM" active={activeRoute === 'monitoring-crm'} onClick={handleNavClick} />
          <NavItem id="pnp-export" icon={Download} label="PnP Export" active={activeRoute === 'pnp-export'} onClick={handleNavClick} />
          <NavItem id="tools" icon={Wrench} label="Tools" active={activeRoute === 'tools'} onClick={handleNavClick} />
          <NavItem id="guide" icon={BookOpen} label="Guide" active={activeRoute === 'guide'} onClick={handleNavClick} />
        </nav>

        {/* Footer - Profile */}
        <div className="p-3 border-t border-sidebar-border relative z-10">
          <div className="flex items-center p-2 rounded-xl hover:bg-sidebar-hover transition-all duration-300 cursor-pointer group relative overflow-hidden"
            onClick={handleLogout}
            title="Logout"
          >
            {/* Shiny sweep */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(200 80% 60% / 0.12), transparent)' }}
            />
            {/* Tanjiro avatar */}
            <motion.div
              className="w-10 h-10 rounded-full flex items-center justify-center mr-3 overflow-hidden relative flex-shrink-0"
              style={{
                border: '2px solid hsl(200 80% 50% / 0.4)',
                boxShadow: '0 0 10px hsl(200 80% 50% / 0.2)',
                background: 'linear-gradient(135deg, hsl(200 60% 20%), hsl(210 50% 15%))',
              }}
              animate={{
                boxShadow: [
                  '0 0 6px hsl(200 80% 50% / 0.15)',
                  '0 0 14px hsl(200 80% 50% / 0.35)',
                  '0 0 6px hsl(200 80% 50% / 0.15)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img 
                src="https://i.pinimg.com/736x/8b/a2/76/8ba276b1e601e5e0b11536af4f104ea2.jpg" 
                alt="Tanjiro" 
                className="w-full h-full object-cover"
              />
            </motion.div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-sm font-semibold text-primary-foreground truncate">
                {getSession()?.username || 'User'}
              </p>
              <p className="text-[10px] font-medium truncate" style={{ color: 'hsl(200 70% 55% / 0.7)' }}>
                鬼殺隊 • 水柱
              </p>
            </div>
            <LogOut className="w-4 h-4 text-sidebar-muted group-hover:text-destructive transition-colors relative z-10 flex-shrink-0" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar */}
        <header className="h-14 bg-card border-b border-topbar-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-sm relative overflow-hidden">
          {/* Subtle top water line */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[1px] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent 5%, hsl(200 80% 55% / 0.2) 30%, hsl(200 80% 55% / 0.3) 50%, hsl(200 80% 55% / 0.2) 70%, transparent 95%)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-muted rounded-lg transition-colors group">
              <Menu className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            <div className="hidden sm:flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Dashboard</span>
              <ChevronRight className="w-3 h-3 mx-2" />
              <span className="text-foreground">{meta.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-muted rounded-full transition-all group"
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode 
                ? <Sun className="w-4 h-4 text-muted-foreground group-hover:text-yellow-400 transition-colors" /> 
                : <Moon className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
              }
            </button>
            <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
            </button>
            <div className="h-6 w-px bg-border mx-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 pl-1 pr-3 py-1 hover:bg-muted rounded-full transition-all group"
              title="Logout"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border"
                style={{ borderColor: 'hsl(200 60% 50% / 0.3)' }}
              >
                <img 
                  src="https://i.pinimg.com/736x/8b/a2/76/8ba276b1e601e5e0b11536af4f104ea2.jpg" 
                  alt="Tanjiro" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden sm:inline text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Logout</span>
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
