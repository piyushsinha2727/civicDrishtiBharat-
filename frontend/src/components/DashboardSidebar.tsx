import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';
import { User, FileText, Edit, Key, LogOut, LayoutDashboard, Building2, Shield, Users, Activity, Map, BarChart3, Wrench, Calendar, ClipboardCheck, Bell, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [hasPendingDiscipline, setHasPendingDiscipline] = useState(false);

  useEffect(() => {
    const checkDisciplineNotices = async () => {
      try {
        const res = await fetch(getApiUrl('/complaints/notices/all'));
        if (res.ok) {
          const notices = await res.text().then(t => { try { return t ? JSON.parse(t) : []; } catch { return []; } });
          const pending = Array.isArray(notices) && notices.some(n => 
            n.responded && (n.admin_decision === 'Pending' || !n.admin_decision || n.admin_decision === null)
          );
          setHasPendingDiscipline(pending);
        }
      } catch (err) {
        console.error("Sidebar notice check error:", err);
      }
    };
    checkDisciplineNotices();
    const interval = setInterval(checkDisciplineNotices, 3000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Admin Dashboard', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', action: () => navigate('/admin?tab=dashboard') },
        { icon: Shield, label: 'Command Centre', color: 'text-primary', bg: 'bg-primary/10', action: () => navigate('/admin?tab=command-center') },
        { icon: Users, label: 'Engineer Details', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', action: () => navigate('/admin?tab=engineers') },
        { 
          icon: ShieldOff, 
          label: 'Compliance & Discipline', 
          color: hasPendingDiscipline ? 'text-white' : 'text-destructive', 
          bg: hasPendingDiscipline ? 'bg-red-700' : 'bg-destructive/10', 
          action: () => navigate('/admin?tab=discipline'),
          isUrgent: hasPendingDiscipline 
        },
        { icon: Calendar, label: 'Leave Requests', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', action: () => navigate('/admin?tab=leave-requests') },
        { icon: Activity, label: 'Flood Risk Predictor', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', action: () => navigate('/admin?tab=flood-risk') },
        { icon: Map, label: 'Live City Heatmap', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', action: () => navigate('/admin?tab=heatmap') },
      ];
    }

    if (user?.role === 'resolver') {
      return [
        { icon: Wrench, label: 'Operational Terminal', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', action: () => navigate('/resolver') },
        { icon: ClipboardCheck, label: 'Work History', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', action: () => navigate('/resolver?tab=history') },
        { icon: Calendar, label: 'Apply for Leave', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', action: () => navigate('/leave/apply') },
        { icon: Bell, label: 'Leave Status', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-100', action: () => navigate('/leave/status') },
      ];
    }
    
    // Default Citizen / Other roles
    return [
      { icon: LayoutDashboard, label: 'Dashboard', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30', action: () => navigate('/dashboard?tab=dashboard') },
      { icon: FileText, label: 'Report Civic Issues', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', action: () => navigate('/dashboard?tab=report') },
      { icon: FileText, label: 'Track application', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', action: () => navigate('/applications/sent') },
      { icon: Building2, label: 'Nearest Municipality', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', action: () => navigate('/municipality/nearest') },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-border/50 bg-secondary/10 shadow-inner h-[calc(100vh-64px)] overflow-y-auto sticky top-0 relative z-10">
      <div className="p-5 space-y-6 h-full flex flex-col">
        <div className="flex-1">
          <h3 className="text-2xl font-extrabold tracking-tight text-foreground mb-6 pl-2">Account</h3>
          <nav className="space-y-3">
            {menuItems.map((item, index) => {
              const isActive = (item.action.toString().includes('tab=') && location.search.includes(item.action.toString().split('?')[1])) ||
                               (!item.action.toString().includes('tab=') && location.pathname === item.action.toString());
              const isUrgent = (item as any).isUrgent;
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className={`w-full justify-start transition-all h-14 shadow-sm rounded-xl relative overflow-hidden ${
                    isUrgent 
                      ? 'bg-red-600 hover:bg-red-700 text-white font-black border-2 border-red-400 animate-pulse shadow-lg shadow-red-600/50' 
                      : isActive 
                        ? 'bg-secondary/80 border-border/40 text-foreground' 
                        : 'text-foreground/90 hover:text-foreground hover:bg-secondary/60 border-transparent'
                  }`}
                  onClick={item.action}
                >
                  <div className={`mr-2.5 shadow-sm rounded-lg p-2 ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <span className="font-bold text-[14px] flex-1 text-left truncate">{item.label}</span>
                  {isUrgent && (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black uppercase bg-white text-red-600 rounded-md tracking-tighter shrink-0 animate-bounce">
                      ACTION REQUIRED
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
            className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive h-11 font-bold"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Log Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
