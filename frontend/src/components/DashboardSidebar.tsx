import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import { 
  User, FileText, Edit, Key, LogOut, LayoutDashboard, Building2, 
  Shield, Users, Activity, Map, BarChart3, Wrench, Calendar, 
  ClipboardCheck, Bell, ShieldOff, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [hasPendingDiscipline, setHasPendingDiscipline] = useState(false);
  const [hasPendingLeaves, setHasPendingLeaves] = useState(false);
  const [hasDissatisfied, setHasDissatisfied] = useState(false);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        // 1. Check Disciplinary notices
        const resNotice = await fetch(getApiUrl('/complaints/notices/all'));
        if (resNotice.ok) {
          const notices = await resNotice.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
          const pendingNotice = Array.isArray(notices) && notices.some(n => 
            n.responded && (n.admin_decision === 'Pending' || !n.admin_decision || n.admin_decision === null)
          );
          setHasPendingDiscipline(pendingNotice);
        }

        // 2. Check Pending Leave Requests
        const resLeave = await fetch(getApiUrl('/leave/all'));
        if (resLeave.ok) {
          const leaves = await resLeave.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
          const pendingLeave = Array.isArray(leaves) && leaves.some(l => l.status === 'Pending');
          setHasPendingLeaves(pendingLeave);
        }

        // 3. Check Dissatisfied Customer Complaints
        const resComp = await fetch(getApiUrl('/complaints'));
        if (resComp.ok) {
          const comps = await resComp.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
          const hasDissat = Array.isArray(comps) && comps.some(c => c.satisfaction_status === 'Dissatisfied');
          setHasDissatisfied(hasDissat);
        }
      } catch (err) {
        console.error("Sidebar alerts check error:", err);
      }
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 4000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      const disciplineAlert = hasPendingDiscipline || hasDissatisfied;
      return [
        { icon: LayoutDashboard, label: 'Admin Dashboard', shortLabel: 'Dashboard', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', action: () => navigate('/admin?tab=dashboard') },
        { icon: Shield, label: 'Command Centre', shortLabel: 'Command', color: 'text-primary', bg: 'bg-primary/10', action: () => navigate('/admin?tab=command-center') },
        { icon: Users, label: 'Engineer Details', shortLabel: 'Engineers', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', action: () => navigate('/admin?tab=engineers') },
        { 
          icon: ShieldOff, 
          label: 'Compliance & Discipline', 
          shortLabel: 'Discipline',
          color: disciplineAlert ? 'text-white' : 'text-destructive', 
          bg: disciplineAlert ? 'bg-red-700' : 'bg-destructive/10', 
          action: () => navigate('/admin?tab=discipline'),
          isUrgent: disciplineAlert,
          badgeText: hasDissatisfied ? 'ISSUE' : 'URGENT'
        },
        { 
          icon: Calendar, 
          label: 'Leave Requests', 
          shortLabel: 'Leaves', 
          color: hasPendingLeaves ? 'text-white' : 'text-rose-600 dark:text-rose-400', 
          bg: hasPendingLeaves ? 'bg-rose-700' : 'bg-rose-100 dark:bg-rose-900/30', 
          action: () => navigate('/admin?tab=leave-requests'),
          isUrgent: hasPendingLeaves,
          badgeText: 'PENDING'
        },
        { icon: Activity, label: 'Flood Risk Predictor', shortLabel: 'Flood Risk', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', action: () => navigate('/admin?tab=flood-risk') },
        { icon: Map, label: 'Live City Heatmap', shortLabel: 'Heatmap', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', action: () => navigate('/admin?tab=heatmap') },
      ];
    }

    if (user?.role === 'resolver') {
      return [
        { icon: Wrench, label: 'Operational Terminal', shortLabel: 'Terminal', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', action: () => navigate('/resolver') },
        { icon: ClipboardCheck, label: 'Work History', shortLabel: 'History', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', action: () => navigate('/resolver?tab=history') },
        { icon: Calendar, label: 'Apply for Leave', shortLabel: 'Apply Leave', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', action: () => navigate('/leave/apply') },
        { icon: Bell, label: 'Leave Status', shortLabel: 'Leave Status', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-100', action: () => navigate('/leave/status') },
      ];
    }
    
    // Default Citizen / Other roles
    return [
      { icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', action: () => navigate('/dashboard?tab=dashboard') },
      { icon: FileText, label: 'Report Civic Issues', shortLabel: 'Report Issue', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', action: () => navigate('/dashboard?tab=report') },
      { icon: Bell, label: 'Track Application', shortLabel: 'Track Status', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', action: () => navigate('/applications/sent') },
      { icon: Building2, label: 'Nearest Municipality', shortLabel: 'Municipality', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', action: () => navigate('/municipality/nearest') },
    ];
  };

  const menuItems = getMenuItems();

  const isItemActive = (actionFn: () => void) => {
    const actionStr = actionFn.toString();
    if (actionStr.includes('tab=')) {
      const match = actionStr.match(/tab=([^"'\)]+)/);
      if (match && location.search.includes(`tab=${match[1]}`)) {
        return true;
      }
    }
    if (actionStr.includes('/applications/sent') && location.pathname.includes('/applications/sent')) return true;
    if (actionStr.includes('/municipality/nearest') && location.pathname.includes('/municipality/nearest')) return true;
    if (actionStr.includes('/leave/apply') && location.pathname.includes('/leave/apply')) return true;
    if (actionStr.includes('/leave/status') && location.pathname.includes('/leave/status')) return true;
    if (actionStr.includes('/admin') && location.pathname === '/admin' && !location.search.includes('tab=')) return true;
    if (actionStr.includes('/resolver') && location.pathname === '/resolver' && !location.search.includes('tab=')) return true;
    if (actionStr.includes('/dashboard') && location.pathname === '/dashboard' && (!location.search || location.search.includes('tab=dashboard'))) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Top Navigation Pills Bar (< lg) */}
      <div className="block lg:hidden w-full bg-card/95 backdrop-blur-md border-b border-border/60 py-2 px-3 sticky top-14 z-40 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {menuItems.map((item, index) => {
            const active = isItemActive(item.action);
            const isUrgent = (item as any).isUrgent;

            return (
              <button
                key={index}
                onClick={item.action}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  isUrgent
                    ? 'bg-red-600 text-white font-black animate-pulse shadow-md'
                    : active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/70 text-foreground hover:bg-secondary border border-border/40'
                }`}
              >
                <item.icon className={`h-3.5 w-3.5 ${active || isUrgent ? 'text-white' : item.color}`} />
                <span>{item.shortLabel || item.label}</span>
                {isUrgent && (
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar (lg+) */}
      <aside className="w-64 shrink-0 hidden lg:block border-r border-border/50 bg-secondary/10 shadow-inner h-[calc(100vh-64px)] overflow-y-auto sticky top-16 relative z-10">
        <div className="p-5 space-y-6 h-full flex flex-col">
          <div className="flex-1">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground mb-6 pl-2">Account</h3>
            <nav className="space-y-2.5">
              {menuItems.map((item, index) => {
                const active = isItemActive(item.action);
                const isUrgent = (item as any).isUrgent;
                
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    className={`w-full justify-start transition-all h-13 shadow-sm rounded-xl relative overflow-hidden ${
                      isUrgent 
                        ? 'bg-red-600 hover:bg-red-700 text-white font-black border-2 border-red-400 animate-pulse shadow-lg shadow-red-600/50' 
                        : active 
                          ? 'bg-primary text-primary-foreground font-bold shadow-md' 
                          : 'text-foreground/90 hover:text-foreground hover:bg-secondary/70 border-transparent'
                    }`}
                    onClick={item.action}
                  >
                    <div className={`mr-2.5 shadow-sm rounded-lg p-2 ${active ? 'bg-white/20' : item.bg}`}>
                      <item.icon className={`h-5 w-5 ${active ? 'text-white' : item.color}`} />
                    </div>
                    <span className="font-bold text-[14px] flex-1 text-left truncate">{item.label}</span>
                    {isUrgent && (
                      <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black uppercase bg-white text-red-600 rounded-md tracking-tighter shrink-0 animate-bounce">
                        {(item as any).badgeText || 'URGENT'}
                      </span>
                    )}
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-border/50 mt-auto">
            <Button
              variant="ghost"
              onClick={() => { logout(); navigate('/'); }}
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive h-11 font-bold rounded-xl"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Log Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
